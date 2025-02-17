# Use Ubuntu Focal as base image
FROM ubuntu:focal

# Set the shell
SHELL ["/bin/bash", "-c"]

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl git && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*  # Clean up to reduce image size

# Set working directory
WORKDIR /home/app

# Copy required files
COPY main.sh main.sh
COPY script.js script.js
COPY package*.json .

# Install Node.js dependencies
RUN npm install

# Set permissions
RUN chmod +x main.sh script.js

# Set the entrypoint
ENTRYPOINT ["/home/app/main.sh"]