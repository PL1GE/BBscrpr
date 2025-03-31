# Use an official Node.js image with Debian (which works well with Playwright)
FROM node:16-buster

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install npm dependencies
COPY package*.json ./
RUN npm install

# Install Playwright browsers (and their dependencies)
RUN npx playwright install --with-deps

# Copy the rest of your application code
COPY . .

# Expose a port if your app serves HTTP (optional)
EXPOSE 8080

# Define the command to run your app
CMD ["npm", "start"]
