FROM node:current-buster-slim

WORKDIR /logs

COPY . .

RUN apt update

RUN apt-get install sqlite3 libsqlite3-dev -y

RUN npm install

RUN npm install -g pm2

CMD ["pm2-runtime", "./dist/server.js"]