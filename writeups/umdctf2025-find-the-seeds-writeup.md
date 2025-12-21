---
title: "UMDCTF 2025: misc/find the seeds"
date: "2025-04-30"
description: "Writeup for the find the seeds misc challenge of the UMDCTF 2025."
---

# UMDCTF 2025: misc/find the seeds

#### April 30, 2025

- **Name:** find the seeds
- **Description:** can u help Alice find her seeds in the bin? She's pretty sure the bin hasn't been dumped since it was generated.

In this challenge, we are given two files: a **binary** file (secret.bin) and a **Python script** (secret.py). Let's quickly check the binary file with `xxd`, which will allow us to see the **hexadecimal data** of the file:

```
$ xxd secret.bin
00000000: 1047 a8b7 cafc c837 fc9d 71b2 bf29 dd08  .G.....7..q..)..
00000010: 2123 6106 3c0a ff1a f345 cedc 3d30 00e1  !#a.<....E..=0..
00000020: 372b                                     7+   
```

Judging by the small length of the file and the fact that there is no apparent binary header, we can come to the conclusion that this is a binary file with **raw hexadecimal data** which is not meant to be executed. The bytes of the file don't ressemble any ASCII string either, at least not directly. 

Let's open the **Python script** now:

```
import random
import time

seed = int(time.time())
random.seed(seed)

plaintext = b"UMDCTF{REDACTED}"
keystream = bytes([random.getrandbits(8) for _ in range(len(plaintext))])
ciphertext = bytes([p ^ k for p, k in zip(plaintext, keystream)])

with open("secret.bin", "wb") as f:
f.write(ciphertext)
```

At first glance, it looks like this script writes into the binary file we were given. Judging by the name of the variable `ciphertext`, it turns out that some **ciphered text** is written into the file.

So all in all, it seems like the flag is hidden in `secret.bin` via some cipher algorithm performed in `secret.py`.

## Objective

Our goal is to **decipher the binary file** to capture the flag, by finding the vulnerability in the script.

## Writeup

### How does the flag get ciphered?

Let's break down the script:

```
import random
import time

# Generates a seed by using the current time
seed = int(time.time())
# Sets the generated seed to generate random numbers
random.seed(seed)
```

At the beginning of the code, we can see how the script uses **randomness** to cipher the file, because it generates a **seed**.

### What's a seed?

It's difficult to generate random numbers. Well, "true" random numbers at least. In order to generate an actual random number you need a completely unpredictable system, and getting one is easier said that done. The "chaotic" nature of some physical processes like **radioactive decay or thermal noise** are some of these systems that can be used to generate actual random numbers, and simulating those processes takes time and resources.

Fortunately, conventional computers have an easy workaround: generating **pseudo-random numbers**. These numbers are not entirely random, but they *feel* random. Here's where seeds come into play.

A seed is just a number, any number. It's the initial value of a sequence of random numbers. Going back to Python, we can set a seed and generate a bunch of numbers like this:

```
import random

# We set the seed
random.seed(42)
# We print five random numbers from 1 to 100
for _ in range(5):
	print(random.randint(1, 100))
```

 This will output:
 
 ```
82
15
4
95
36
``` 

The seed `42`'s first five pseudo-random numbers are 84, 15, 4, 95 and 36. Another seed, for example, `748349924`, has 64, 93, 35, 62 and 14 as the first numbers. Each seed has a **different sequence**, but this sequence does not change inside the scope of the algorithm you're using to generate random numbers. The seed `42` will **always** generate the same seemingly random sequence inside the algorithm you're using. Python's `random` library uses the [Mersenne Twister algorithm](https://es.wikipedia.org/wiki/Mersenne_twister) in order to generate random numbers, as a matter of fact.

In order to select a seed, the usual go-to number is whatever [UNIX timestamp](https://www.unixtimestamp.com/) you're on during runtime. This is convenient because it's a big, easy to obtain number that changes every second. In fact, this is precisely how the challenge script gets the seed:

```
import random
import time

# Generates a seed by using the current time
seed = int(time.time())
# Sets the generated seed to generate random numbers
random.seed(seed)
```


### The cipher

Now let's take a look at the lines that actually generate the ciphered text:

```
plaintext = b"UMDCTF{REDACTED}" # Text that will be ciphered
# Creates a byte array of 8-bit-long random numbers up to the text length
keystream = bytes([random.getrandbits(8) for _ in range(len(plaintext))])
# Ciphers the text executing a XOR operation for each pair of characters
# in plaintext and keystream
ciphertext = bytes([p ^ k for p, k in zip(plaintext, keystream)])
```

First, it defines a string variable, containing the text that will be deciphered. In this case, a fake flag.

Then, it creates a byte array, and for each character in `plaintext`, it will append to said array a random number of 8 bits that generates with the `getrandbits()`function. This array of random numbers is what will create the ciphered text. Let's break down how it does it:

The **for** loop that is used to append to `ciphertext` uses a function called `zip()`. This function takes two strings and returns a list with **character pairs** of those strings. The pairs will have the N'th character of `plaintext` with the N'th character of `keystream`. The for loop takes each element of each pair with the `p` and `k` variables and performs a `XOR` operation (`^`) with them that will be appended to the array.  

As an example, if we have the string **"SEED"** in `plaintext` and the numbers 0x78, 0x04, 0x65 and 0x12 in `keystream`, this would be the what's stored in `ciphertext`:

	0x83 0x69 0x69 0x68  ("SEED" in ASCII)
	0x78 0x04 0x65 0x12  (the keystream)
	-------------------  XOR
	0xFB 0x6D 0x0C 0x7A  (ciphered text)

This is what gets written in `secret.bin`.

### Deciphering

The written text is created by a `XOR` operation, so it would be natural to think that in order to decipher the text we'd need to **undo** the `XOR` operation. This is easy to do, as `XOR` is its own inverse, meaning that in order to undo the previous operation, we just need to `XOR` the result of it with one of its operands to obtain the other operand:

	0xFB 0x6D 0x0C 0x7A  (ciphered text)
	0x78 0x04 0x65 0x12  (the keystream)
	-------------------  XOR
	0x83 0x69 0x69 0x68  ("SEED" in ASCII)
	
We've made some substancial progress up to this point. We know how the text is ciphered and how to decipher it. But here's the catch! While we do know how the cipher works, the algorithm relies on **random numbers**. The numbers used for ciphering the flag were created with an unknown seed, so our deciphering attempts will be futile. **We don't have the keystream array that was used to cipher the flag, but if we find it, we will be able to decipher the flag.**

### The vulnerability

Let's go back to square one. **The seeds**. There's a key property mentioned before that will allow us to find the breach to get the flag. **A seed will always generate the same sequence of random numbers.** This means that the only thing we need to get the keystream is the seed that was used to generate it. And, lo and behold, we do know how the seed was created!

```
import random
import time

seed = int(time.time())
random.seed(seed)
```

The seed was created with the `time` library! Here's the vulnerability, because the seed is not an arbitrary number; it's the instance in which the flag was generated. This means that we can **brute-force** the flag by "**going back in time**" second by second with another script. For each second that we travel back into, we perform the reverse `XOR` operation until we get to the timestamp in which the flag was generated. Once we get there, the random keystream generated will be the same with which the flag was ciphered, and that will give us the last piece we need to perform the reverse operation. The script we need is pretty similar to the one the challenge gives us. Let's break it down step by step:

First, let's open the file and declare some variables:

```
import random
import time

# We open the file and store in ciphertext the content of it
with open('secret.bin', 'rb') as file:
	ciphertext = file.read()

# We initialize the variable in which the deciphered text will be stored
decipheredtext = ""
# An incremental variable that will be used to go back in time
count = 0
# We get the current timestamp
seed = int(time.time())
```

Now, let's create the loop that will brute-force the flag:

```
# This loop will stop once the deciphered text contains "UMDCTF{" in it
while "UMDCTF{" not in str(decipheredtext):
	# For each iteration, we decrement the seed by one
	# This makes us go back in time second by second for each iteration
	random.seed(seed - count)
	# We generate the keystream of the seed
	keystream = bytes([random.getrandbits(8) for _ in range(len(ciphertext))])
	# We use the generated keystream to perform the reverse XOR operation
	# (Mind how now instead of using the plain text in zip() we use the ciphered text)
	deciphertext = bytes([p ^ k for p, k in zip(ciphertext, keystream)])

	count += 1
```

Because of the context of the challenge, we know that the flag starts with the string `"UMDCTF{"`. This comes in handy because we can use it as a stop condition. Once we find a deciphered text that starts like that, we can be sure that we've found the flag.

Now we just need to execute the script and wait for a few seconds (or more depending on when you execute the script, the more in the future you are relative to the stamp that was used for the seed), and sure enough, in due time, we'll get the flag!

Here's the full code, with a few output messages that print the flag and other info:

```
import random
import time

with open('secret.bin', 'rb') as file:
	ciphertext = file.read()

decipheredtext = ""
count = 0
seed = int(time.time())

while "UMDCTF{" not in str(decipheredtext):
	random.seed(seed - count)

	keystream = bytes([random.getrandbits(8) for _ in range(len(ciphertext))])
	deciphertext = bytes([p ^ k for p, k in zip(ciphertext, keystream)])

	count += 1

print(f"Flag: {decipheredtext}")

print(f"Complete in {count} iterations")

print(f"Stamp in which the seed was generated: {int(time.time()) - count}")
```

## Conclusion

Seed-based pseudo-random number generation algorithms are fine for **casual, uncompromised uses**. But as we've seen, **these algorithms are not cryptographically safe** and **should not** be used for password generation or similar uses.