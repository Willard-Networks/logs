FROM node:20.5-bookworm-slim

WORKDIR /logs

COPY . .

RUN apt update

RUN npm install

RUN npm install -g pm2

RUN npm run build

CMD ["pm2-runtime", "./dist/server.js"]
