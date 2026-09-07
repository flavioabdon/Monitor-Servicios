FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm install

COPY src ./src

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
