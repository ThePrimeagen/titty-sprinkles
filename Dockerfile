FROM node:18-alpine3.15
WORKDIR /app
COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock
RUN yarn install

COPY tsconfig.json /app/tsconfig.json
COPY src /app/src
RUN npx tsc

CMD ["node", "/app/dist/index.js"]
