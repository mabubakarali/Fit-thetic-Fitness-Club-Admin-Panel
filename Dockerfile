FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts
COPY server ./server
COPY data ./data
EXPOSE 5000
CMD ["node", "server/index.js"]
