FROM node:current-buster-slim

COPY . .

RUN npm install

RUN npm run build

CMD ["npm", "run", "start"]