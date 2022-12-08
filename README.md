# MiroTalk C2C

MiroTalk C2C WebRTC real-time cam-2-cam video calls & screen sharing, end-to-end encrypted, to embed in any website with a simple iframe.

```html
<iframe
    allow="camera; microphone; fullscreen; display-capture; autoplay"
    src="https://c2c.mirotalk.com"
    style="height: 100%; width: 100%; border: 0px;"
></iframe>
```

`Live demo`: https://c2c.mirotalk.com

![mirotalkc2c](./frontend/images/ui.png)

## Quick start

```bash
# Go to project dir
$ cd mirotalkc2c
# Install dependencies
$ npm install
# Start the server
$ npm start
```

## Docker

```bash
# Build or rebuild services
$ docker-compose build
# Create and start containers
$ docker-compose up
```

[Docker official image](https://hub.docker.com/r/mirotalk/c2c)

## Join room

Home page: http://localhost:8080

Home page with room param: http://localhost:8080/?room=test

Direct join: http://localhost:8080/join?room=test&name=test

| Params | Type   | Description |
| ------ | ------ | ----------- |
| room   | string | roomId      |
| name   | string | userName    |

## Discussions

Join with us on [Discord](https://discord.gg/rgGYfeYW3N), ask questions and post answers without opening issues.

## Support

You can support MiroTalk by [sponsoring](https://github.com/sponsors/miroslavpejic85) it. Thanks!

## License

[MIT](./LICENSE)
