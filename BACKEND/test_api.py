import requests

url = "http://127.0.0.1:5500/predict"

# Ask user to enter news text
text = input("Enter news text: ")
data = {"text": text}

response = requests.post(url, json=data)
print(response.json())