FROM node:18-alpine 

WORKDIR /src

RUN apk add --no-cache \
	bash \
	vim

COPY package.json .
COPY .env ./.env

RUN npm install

COPY frontend frontend
COPY backend backend

EXPOSE 8080/tcp

CMD npm start