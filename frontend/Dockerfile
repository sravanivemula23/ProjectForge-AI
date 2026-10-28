FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 5173
# API_PROXY_TARGET is set by docker-compose to the backend service hostname
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
