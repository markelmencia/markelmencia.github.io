---
title: "Break The Syntax 2025: crypto/Roulette"
date: "2025-05-31"
description: "Writeup for the Roulette Crypto challenge of the Break The Syntax CTF 2025."
---

# Break The Syntax CTF 2025: crypto/roulette

#### May 31, 2025

This challenge simulates a "Provably Fair Roulette". In order to interact with the challenge we have to connect to the server that runs it. To get the flag, according to the given description, **we must get the number 13 a total of 37 times in a row**. To do so, we are given the code that runs in the server.

## Objective

Somehow manipulate our interaction with the server to **hardcode the number 13 as the resulting number** of the roulette.

## Writeup

### The server

Let's look at the **Python script** that runs in the server, to see how the winner number is generated:

```
from hashlib import sha256
import secrets


def get_color(number):
    """Determine roulette color for a given number"""
    if number == 0:
        return 'green'
    return 'red' if number % 2 == 1 else 'black'

def main():
    print("Welcome to Provably Fair Roulette!")
    
    with open('flag', 'rt') as f:
        FLAG = f.read()
        
    streak_13 = 0
    while True:
        # Generate server seed and its hash
        server_seed = sha256(bytes(secrets.randbits(17))).hexdigest()
        server_seed_hash = sha256(server_seed.encode()).hexdigest()
        
	    print(f"Server seed hash (verify later): {server_seed_hash}")
        # Get client seed
        print("Enter your client seed (press enter to generate): ", end="")
        client_seed = input().strip()
        if not client_seed:
            client_seed = secrets.token_bytes(8).hex()
            print(f"Generated client seed: {client_seed}")
            
        # Generate game hash
        combined = f"{server_seed}:{client_seed}"
        game_hash = sha256(combined.encode()).hexdigest()
        hash_int = int(game_hash, 16)
        
        # Calculate roulette result
        roulette_number = hash_int % 37  # 0-36
        roulette_color = get_color(roulette_number)
		
	    # Get user's bet
        while True:
            print("Place your bet (number 0-36 or color red/black/green): ", end="")
            bet = input().strip().lower()
            if bet in ['green', 'red', 'black']:
                break
            try:
                num = int(bet)
                if 0 <= num <= 36:
                    bet = str(num)  # Standardize to string for comparison
                    break
                print("Number must be between 0-36")
            except ValueError:
                print("Invalid bet. Enter number (0-36) or color (red/black/green)"
        
        # Determine result
        result_str = f"{roulette_number} ({roulette_color})"
        print(f"\nThe wheel lands on: {result_str}")
        
        # Check win conditions
        win = False
        if bet.isdigit():
            win = int(bet) == roulette_number
        else:
            win = bet == roulette_color
		   
        if win:
            print("Congratulations! You win! ")
            if roulette_number == 13:
                print("...and you got 13, double congratulations!")
                streak_13 += 1
            else:
                print("But it's not 13, no streak for you")
                streak_13 = 0
        else:
            print("Sorry, you lose!")
            streak_13 = 0
	    
		# Verification information
        print()
        print("Verification Details:")
        print(f"Server seed: {server_seed}")
        print(f"Client seed: {client_seed}")
        print(f"Combined string: {combined}")
        print(f"Game hash: {game_hash}")
        print(f"Calculated number: {roulette_number}")
        print(f"Resulting color: {roulette_color}")

        if streak_13 == 37:
            print("How? How is it possible? What was the chance?! " f"Anyway, here's your flag, congratulations... {FLAG}")
            exit()

if __name__ == "__main__":
    main()
```

First it generates a server seed, which is just **a random 17-bit long hexadecimal number**. Then it hashes it, it prints it out to us:

```
# Generate server seed and its hash
server_seed = sha256(bytes(secrets.randbits(17))).hexdigest()
server_seed_hash = sha256(server_seed.encode()).hexdigest()

print(f"Server seed hash (verify later): {server_seed_hash}")
```

Then the server asks us for input. This will be our seed:

```
# Get client seed
print("Enter your client seed (press enter to generate): ", end="")
client_seed = input().strip()
if not client_seed:
    client_seed = secrets.token_bytes(8).hex()
    print(f"Generated client seed: {client_seed}")
```

Here's the important part: in order to calculate the roulette number, the server seed gets **concatenated** with our seed and then it's turned into a hash. The hash is parsed into an integer, and once we calculate its module with 37, it will generate a number between 0 and 36, just like in a roulette. The color is also calculated, but we can overlook that as it doesn't help us get the flag:

```python
# Generate game hash
combined = f"{server_seed}:{client_seed}"
game_hash = sha256(combined.encode()).hexdigest()
hash_int = int(game_hash, 16)
        
# Calculate roulette result
roulette_number = hash_int % 37  # 0-36
roulette_color = get_color(roulette_number)
```

### How it generates the number

As we've seen, the server will generate a seed and will asks us for another one. Then, it will combine both seeds to generate a random number between 0 and 36. This is pretty much how the server gets the number.

### What do we know?

We have a decent amount of data of how the server operates. We know:
- How the server **generates the winning number**
- Our **client seed** (since we give it to the server)
- The **hashed server seed**.
- The fact that the **server seed** is a random number of a **fixed size** (17 bits).

Smell something fishy? With this data we have everything we need to get the flag, let's see how!

### The vulnerability

Considering that the server allows us to introduce our own seed, all we need to do is provide one that **we know** will generate a 13. But how do we know if a client seed will generate a 13? Let's go back to the server script:

```
# Generate game hash
combined = f"{server_seed}:{client_seed}"
game_hash = sha256(combined.encode()).hexdigest()
hash_int = int(game_hash, 16)

# Calculate roulette result
roulette_number = hash_int % 37  # 0-36
roulette_color = get_color(roulette_number)
```

The way the number is generated is by **combining the server and client seed**. This means that if we knew the server seed, we could just **bruteforce** a winning client seed by generating a random client seed, concatenate it with the server seed, and calculating the number it would generate, until we find a seed that does indeed generate a 13. There's a slight issue though, **we don't know the server seed**. Or do we?

The server gives us it server seed hashed. However, we know that the length of the seed is 17 bits, so there's nothing stopping us from bruteforcing the server seed! All we need to do is to **iterate through every number between 0 and 2¹⁷, generate its hash**, and check if that hash is equal to the server hash the server has given us. That way, we'd get the **seed number**:

```
def get_server_seed(server_seed_hash):
	i = 0
	for i in range(int(math.pow(2, 17))):
		potential_server_seed = sha256(bytes(i)).hexdigest()
		potential_server_seed_hash = sha256(potential_server_seed.encode()).hexdigest()
		if potential_server_seed_hash == server_seed_hash:
			break
	
	server_seed = sha256(bytes(i)).hexdigest()
	return server_seed
```

With this snippet, we can do just that.

By the way, I use **pwntools** to interact with the server and get the server seed (and later introduce my client seed). Considering that the winner flow of the output of the server is like this:

```
Welcome to Provably Fair Roulette!
Server seed hash (verify later): <random hash>
Enter your client seed (press enter to generate): <winner hash>
Place your bet (number 0-36 or color red/black/green): 13

The wheel lands on: 13 (red)
Congratulations! You win!
...and you got 13, double congratulations!

Verification Details:
Server seed: <random hash>
Client seed: <winner hash>
Combined string: <random hash>:<winner hash>
Calculated number: 13
Resulting color: red
```

Here's how you can split the output to store the hashed server seed in a variable:

```
conn = remote('localhost',8081) # The port my server was running on
# The challenge requires us to get the number 13 a total of 37 times in a row
for o in range(37):
	conn.recvline() # "Welcome to Provably Fair Roulette!"
	response = conn.recvline().decode().strip() # This line contains the hash
	server_hash = response.split()[5]
	
	print(f"Server hash: {server_hash}")
	
	# *Now* we get the server seed
	server_seed = get_server_seed(server_hash)
```

Now we have the server seed, which was the last piece we needed to be able to **bruteforce a client seed that always generates the number 13** on the roulette. Let's see how we can bruteforce the seed:

```
def get_winner_client_seed(server_seed):
	client_seed = ""
	while True:
		# Randomly generate a seed
		client_seed = secrets.token_bytes(8).hex()
		# Combine it with the server seed
		combined = f"{server_seed}:{client_seed}"
		# Get the game hash with the combined seed
		game_hash = sha256(combined.encode()).hexdigest()
		hash_int = int(game_hash, 16)
		# Check if the roulette number of the hash is 13
		roulette_number = hash_int % 37 # 0-36
		if roulette_number == 13:
			break
	
	return client_seed
```

This generates a winner seed that, together with the server seed, will always generate the number 13. That's all the technicality of the challenge! Now we just need to complete the **pwntools** script to interact properly with the server.

First we generate the **winner seed** on the script, and then we use it as input:

```
# Gets a winner seed
winner_seed = get_winner_client_seed(server_seed)
print("Winner seed obtained")

# We wait a second because there's no delimiter because the server is now asking for input
# (There likely is a much better way to do this)
conn.recv(timeout=1)
# We send our winner seed as input
conn.sendline(winner_seed.encode())
```

Then the server will ask us which number do we think we'll be the winner. Since we know it will be 13, and that's the number we need to get 37 times in a row, we say it will be 13:

```
conn.recv(timeout=1)
conn.sendline("13".encode())
```

By this point we've guessed correctly. To check that we did, we print the next two lines we receive from the server, and skip over the rest:

```
conn.recvline()
# This will print that we indeed guessed right
print(conn.recvline())
print(conn.recvline())
# We skip over unnecessary information
for _ in range(8):
	conn.recvline()
```

And that's it! Now we just need to do it **37 more times**. So, putting it all together:

```
from pwn import *
from hashlib import *
import secrets

def get_winner_client_seed(server_seed):
    client_seed = ""
    while True:     
        # Randomly generate a seed
        client_seed = secrets.token_bytes(8).hex()
        # Combine it with the server seed
        combined = f"{server_seed}:{client_seed}"
        # Get the game hash with the combined seed
        game_hash = sha256(combined.encode()).hexdigest()
        hash_int = int(game_hash, 16)
        
        # Check if the roulette number of the hash is 13
        roulette_number = hash_int % 37  # 0-36
        if roulette_number == 13:
            break
    
    return client_seed


def get_server_seed(server_seed_hash):
    i = 0
    for i in range(int(math.pow(2, 17))):
        potential_server_seed = sha256(bytes(i)).hexdigest()
        potential_server_seed_hash = sha256(potential_server_seed.encode()).hexdigest()
        if potential_server_seed_hash == server_seed_hash:
            break
    
    server_seed = sha256(bytes(i)).hexdigest()
    return server_seed


def main():
    conn = remote('localhost',8081)
    # The challenge requires us to get the number 13 a total of 37 times in a row
    for o in range(37):
		
        conn.recvline()
        response = conn.recvline().decode().strip() # This line contains the server hash
        server_hash = response.split()[5]
        print(f"Server hash: {server_hash}")
        
        # Gets the server seed
        server_seed = get_server_seed(server_hash)
        
        # Gets a winner seed
        winner_seed = get_winner_client_seed(server_seed)
        print("Winner seed obtained")
        
        # We wait a second because there's no delimiter because the server is now asking for input
        # (There likely is a much better way to do this)
        conn.recv(timeout=1)
        # We send our winner seed as input and guess that the number will be 13
        conn.sendline(winner_seed.encode())
        
        conn.recv(timeout=1)
        conn.sendline("13".encode())
        
        conn.recvline()
        # This will print that we indeed guessed right
        print(conn.recvline())
        print(conn.recvline())
        
        # We skip over unnecessary information
        for _ in range(8):    
            conn.recvline()
	
	
    # By this point we've guessed enough to get the flag
    conn.recvline()
    # Should print the flag
    print(conn.recvline())
    conn.close()


if __name__ == "__main__":
    main()
```

Notice how I print the flag after the loop.

## Conclusion

**Bruteforcing** is a very handy (and fun, in my opinion) tool that can help us obtain more data from data that we already have. Always keep an eye open for **bruteforcing oportunities** when you receive a hash!