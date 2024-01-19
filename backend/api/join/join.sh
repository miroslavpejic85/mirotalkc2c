#!/bin/bash

API_KEY_SECRET="mirotalkc2c_default_secret"
MIROTALK_URL="https://c2c.mirotalk.com/api/v1/join"
# MIROTALK_URL="http://localhost:8080/api/v1/join"

curl $MIROTALK_URL \
    --header "authorization: $API_KEY_SECRET" \
    --header "Content-Type: application/json" \
    --data '{"room":"test","name":"mirotalkc2c"}' \
    --request POST