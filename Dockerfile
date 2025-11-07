# Use the official Node.js image as the base image
FROM node:22

# Set the working directory inside the container
WORKDIR /usr/src/app/

# Copy package.json and package-lock.json to the working directory
#COPY output-api/package*.json ./output-api/
COPY . .

# Install the application dependencies
WORKDIR /usr/src/app/output-api
RUN npm i
RUN npm upgrade jwa

RUN sed -i 's/localhost/host.docker.internal/g' env.dev

# Copy the rest of the application files
#COPY output-api/. ./

# Build the NestJS application
#RUN npm run start:dev

# Expose the application port
EXPOSE 3003

# Command to run the application
#CMD ["node", "dist/main"]
CMD ["npm", "run", "start:dev"]