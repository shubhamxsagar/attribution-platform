# Use Node 18 Alpine
FROM node:18-alpine

# 1. INSTALL OPENSSL (This fixes the crash)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client (now with OpenSSL available)
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]