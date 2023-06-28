FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Compile typescript code
RUN npm run build

EXPOSE 8000

RUN chown -R node /usr/src/app

# Start the application
CMD [ "node", "build/src/server.js" ]

