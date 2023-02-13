FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm install -g typescript

COPY . .

RUN tsc

CMD [ "npm", "start" ]
