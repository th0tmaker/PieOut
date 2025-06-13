# # Return an ABI compliant Contract object made from the smart contract json file
# @pytest.fixture(scope="session")
# def sc() -> Contract:
#     with open("./smart_contracts/artifacts/pieout/Pieout.arc56.json") as f:
#         js = json.load(f)

#     # return Contract.from_json(json.dumps(js["methods"])) <- if you want specific key
#     return Contract.from_json(json.dumps(js))


# # Helper method to retrieve the winning player from a JSON file
# @pytest.fixture(scope="session")
# def winner_account() -> SigningAccount | None:
#     try:
#         with open("winner_account.json") as f:
#             data = json.load(f)

#         address = data["address"]
#         private_key = data["private_key"]

#         return SigningAccount(address=address, private_key=private_key)
#     except (FileNotFoundError, KeyError, json.JSONDecodeError):
#         return None
