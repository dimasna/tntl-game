FROM node:18-alpine
# Define build arguments for environment variables
ARG FRONTEND_URL

# Set environment variables during the build process
ENV FRONTEND_URL=$FRONTEND_URL
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]