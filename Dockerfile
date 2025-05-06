# Use Node.js as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy the entire project
COPY . .

# Expose the port (adjust based on your app)
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
