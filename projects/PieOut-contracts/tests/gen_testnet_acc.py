import json

from algosdk import account, mnemonic

# Generate a persistent TestNet account
private_key, address = account.generate_account()

# Save the private key and address to a file
with open("testnet_accs.json", "w") as f:
    json.dump({"address": address, "private_key": private_key}, f, indent=4)

print("TestNet account successfully created and saved to testnest_acc.json")
print("Address:", address)
print("Mnemonic:", mnemonic.from_private_key(private_key))
