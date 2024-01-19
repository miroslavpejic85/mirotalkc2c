# pip3 install requests
import requests
import json

API_KEY_SECRET = "mirotalkc2c_default_secret"
MIROTALK_URL = "https://c2c.mirotalk.com/api/v1/join"
#MIROTALK_URL = "http://localhost:8080/api/v1/join"

headers = {
    "authorization": API_KEY_SECRET,
    "Content-Type": "application/json",
}

data = {
    "room": "test",
    "name": "mirotalkc2c",
}

response = requests.post(
    MIROTALK_URL,
    headers=headers,
    json=data,
)

print("Status code:", response.status_code)
data = json.loads(response.text)
print("join:", data["join"])
