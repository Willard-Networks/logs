FROM node:current-buster-slim

WORKDIR /logs

COPY . .

RUN apt update

RUN apt-get install sqlite3 libsqlite3-dev

RUN npm install --build-from-source --sqlite=/usr/bin sqlite3

RUN npm install -g pm2

CMD ["pm2-runtime", "./dist/server.js"]