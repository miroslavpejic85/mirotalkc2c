<h1 align="center">MiroTalk C2C</h1>

<br />

<p align="center">Free WebRTC Real-Time Cam-2-Cam Video Calls & Screen Sharing, End-to-End Encrypted, to embed in any website with a <a href="https://github.com/miroslavpejic85/mirotalkc2c/issues/2#issuecomment-1340587150" target="_blank">simple iframe.</a></p>

<hr />

<p align="center">
    <a href="https://c2c.mirotalk.com">Explore MiroTalk C2C</a>
</p>

<hr />

<p align="center">
    <a href="https://c2c.mirotalk.com"><img src="./frontend/images/ui.png"></a>
</p>

<hr />

<p align="center">
    Join our community for questions, discussions, and support on <a href="https://discord.gg/rgGYfeYW3N">Discord</a>
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

Open [http://localhost:8080](http://localhost:8080) in your browser.

</details>

<details open>
<summary>Docker</summary>

<br/>

![docker](./frontend/images/docker.png)

Repository: [Docker hub](https://hub.docker.com/r/mirotalk/c2c)

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

Open [http://localhost:8080](http://localhost:8080) in your browser.

</details>

<details>
<summary>Ngrok</summary>

<br/>

You can start a video conference directly from your local PC and make it accessible from any device outside your network by following [these instructions](docs/ngrok.md), or expose it directly on [HTTPS](backend/ssl/README.md).

</details>

</details>

<details>
<summary>Stun/Turn</summary>

<br/>

Install your own [Stun & Turn](https://docs.mirotalk.com/coturn/stun-turn/) by following [this instructions](./docs/coturn.md).

</details>

<details open>
<summary>Self-Hosting</summary>

<br/>

For `self-hosting MiroTalk C2C` on your own dedicated server, please refer to [this comprehensive guide](docs/self-hosting.md). It will provide you with all the necessary instructions to get your MiroTalk C2C instance up and running smoothly.

</details>

<details open>
<summary>Support</summary>

<br/>

Do you find MiroTalk C2C indispensable for your needs? Join us in supporting this transformative project by [becoming a backer or sponsor](https://github.com/sponsors/miroslavpejic85). By doing so, not only will your logo prominently feature here, but you'll also drive the growth and sustainability of MiroTalk C2C. Your support is vital in ensuring that this valuable platform continues to thrive and remain accessible for all. Make an impact – back MiroTalk C2C today and be part of this exciting journey!

</details>

<details>
<summary>License</summary>

<br/>

![AGPLv3](./frontend/images/AGPLv3.png)

MiroTalk C2C is free and open-source under the terms of AGPLv3 (GNU Affero General Public License v3.0). Please `respect the license conditions`, In particular `modifications need to be free as well and made available to the public`. Get a quick overview of the license at [Choose an open source license](https://choosealicense.com/licenses/agpl-3.0/).

To obtain a [MiroTalk C2C license](https://docs.mirotalk.com/license/licensing-options/) with terms different from the AGPLv3, you can conveniently make your [purchase on CodeCanyon](https://codecanyon.net/item/mirotalk-c2c-webrtc-real-time-cam-2-cam-video-conferences-and-screen-sharing/43383005). This allows you to tailor the licensing conditions to better suit your specific requirements.

</details>

<br/>

## Diving into Additional MiroTalk Projects:

<details>
<summary>MiroTalk SFU</summary>

<br>

Try also [MiroTalk SFU](https://github.com/miroslavpejic85/mirotalksfu) `selective forwarding unit` real-time video conferences, optimized for large groups. `Unlimited time, unlimited concurrent rooms` each having 8+ participants, up to ~ 100 per single CPU.

</details>

<details>
<summary>MiroTalk P2P</summary>

<br/>

Try also [MiroTalk P2P](https://github.com/miroslavpejic85/mirotalk) `peer to peer` real-time video conferences, optimized for small groups. `Unlimited time, unlimited concurrent rooms` each having 5-8 participants.

</details>

<details>
<summary>MiroTalk BRO</summary>

<br>

Try also [MiroTalk BRO](https://github.com/miroslavpejic85/mirotalkbro) `Live broadcast` (peer to peer) live video, audio and screen stream to all connected users (viewers). `Unlimited time, unlimited concurrent rooms` each having a broadcast and many viewers.

</details>

<details>
<summary>MiroTalk WEB</summary>

<br>

Try also [MiroTalk WEB](https://github.com/miroslavpejic85/mirotalkwebrtc) a platform that allows for the management of an `unlimited number of users`. Each user must register with their email, username, and password, after which they gain access to their `personal dashboard`. Within the dashboard, users can `manage their rooms and schedule meetings` using the desired version of MiroTalk on a specified date and time. Invitations to these meetings can be sent via email, shared through the web browser, or sent via SMS.

</details>

---
