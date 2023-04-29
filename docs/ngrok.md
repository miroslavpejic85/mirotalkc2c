# MiroTalk C2C - Ngrok

![ngrok](../frontend/images/ngrok.png)

If you want to expose MiroTalk C2C from your `Local PC` to outside in `HTTPS`, you need to do 1 thing

Edit the Ngrok part on `.env` file

```bash
# 1. Goto https://ngrok.com
# 2. Get started for free
# 3. Copy YourNgrokAuthToken: https://dashboard.ngrok.com/get-started/your-authtoken

NGROK_ENABLED=true
NGROK_AUTH_TOKEN=YourNgrokAuthToken
```

---

Then, when you run it with `npm start`, you should see in the console log:

```bash
ngrokHome: 'https://xxxx-xx-xx-xxx-xx.ngrok.io',
ngrokRoom: 'https://xxxx-xx-xx-xxx-xx.ngrok.io/?room=test',
ngrokJoin: 'https://xxxx-xx-xx-xxx-xx.ngrok.io/join?room=test&name=test',
```

So open the URL in your browser, join in the room, `Share` the `URL` to whom you want and wait participants to join.
