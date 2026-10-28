FROM node:20-alpine
ENV NODE_ENV=development
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
EXPOSE 8000
USER node
CMD ["node", "src/server.js"]
