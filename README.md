# <p align="center">MiroTalk C2C</p>

<p align="center">Free WebRTC Real-Time Cam-2-Cam Video Calls & Screen Sharing, End-to-End Encrypted, to embed in any website with a <a href="https://github.com/miroslavpejic85/mirotalkc2c/issues/2#issuecomment-1340587150" target="_blank">simple iframe.</a></p>

<hr />

<p align="center">
    <a href="https://c2c.mirotalk.com">c2c.mirotalk.com</a>
</p>

<hr />

<p align="center">
    <a href="https://c2c.mirotalk.com"><img src="./frontend/images/ui.png"></a>
</p>

<hr />

<details open>
<summary>Quick start</summary>

<br/>

Install [NodeJs](https://nodejs.org/en/blog/release/v18.16.0).

```bash
# Copy .env.template in .env and edit it if needed
$ cp .env.template .env
# Install dependencies
$ npm install
# Start the server
$ npm start
```

Open in browser: http://localhost:8080

</details>

<details open>
<summary>Docker</summary>

<br/>

![docker](./frontend/images/docker.png)

Install [docker](https://docs.docker.com/engine/install/) and [docker-compose](https://docs.docker.com/compose/install/).

```bash
# Copy .env.template in .env and edit it if needed
$ cp .env.template .env
# Copy docker-compose.template.yml in docker-compose.yml and edit it if needed
$ cp docker-compose.template.yml docker-compose.yml
# Get official image from Docker Hub
$ docker pull mirotalk/c2c:latest
# Create and start containers
$ docker-compose up
```

[Docker official image](https://hub.docker.com/r/mirotalk/c2c)

</details>

<details>
<summary>Ngrok</summary>

<br/>

To expose MiroTalk C2C in `HTTPS` from your `Local PC`, just follow [this steps](./docs/ngrok.md).

</details>

</details>

<details>
<summary>Stun/Turn</summary>

<br/>

To install your own [Stun](https://bloggeek.me/webrtcglossary/stun) and [Turn](https://bloggeek.me/webrtcglossary/turn), just follow [this steps](./docs/coturn.md) and edit it in the `.env` file.

</details>

<details open>
<summary>Self-Hosting</summary>

<br/>

To self-hosting MiroTalk C2C, just follow [this steps](./docs/self-hosting.md).

</details>

<details open>
<summary>Discussions</summary>

<br/>

Join with us on [Discord](https://discord.gg/rgGYfeYW3N), ask questions and post answers without opening issues.

</details>

<details>
<summary>Support</summary>

<br/>

You can support MiroTalk by [becoming a backer or sponsor it](https://github.com/sponsors/miroslavpejic85).

</details>

<details>
<summary>License</summary>

<br/>

![AGPLv3](./frontend/images/AGPLv3.png)

MiroTalk is free and can be modified and forked. But the conditions of the AGPLv3 (GNU Affero General Public License v3.0) need to be respected. In particular modifications need to be free as well and made available to the public. Get a quick overview of the license at [Choose an open source license](https://choosealicense.com/licenses/agpl-3.0/).

For a MiroTalk license under conditions other than AGPLv3, please contact us at license.mirotalk@gmail.com or [purchase directly via CodeCanyon](https://codecanyon.net/item/mirotalk-c2c-webrtc-real-time-cam-2-cam-video-conferences-and-screen-sharing/43383005).

Thank you!

</details>

---

<details>
<summary>MiroTalk P2P</summary>

<br>

Try also [MiroTalk P2P](https://github.com/miroslavpejic85/mirotalk) `peer to peer` real-time video conferences, optimized for small groups. Unlimited time, unlimited rooms each having 5-8 participants.

</details>

<details>
<summary>MiroTalk SFU</summary>

<br>

Try also [MiroTalk SFU](https://github.com/miroslavpejic85/mirotalksfu) `selective forwarding unit` real-time video conferences, optimized for large groups. Unlimited time, unlimited rooms each having 8+ participants.

</details>

<details>
<summary>MiroTalk WEB</summary>

<br>

Try also [MiroTalk WEB](https://github.com/miroslavpejic85/mirotalkwebrtc) rooms scheduler.

</details>

---
