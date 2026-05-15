FROM node:21-alpine
WORKDIR /usr/src/app
COPY . .
RUN mkdir -p /usr/src/app/certs && \
    wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -O /usr/src/app/certs/global-bundle.pem
RUN npm install
EXPOSE 80
CMD [ "npm", "start" ]
