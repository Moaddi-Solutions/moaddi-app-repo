# Dockerfile
FROM thyrlian/android-sdk

RUN apt-get update

# Install necessary packages
RUN sdkmanager "platform-tools" "build-tools;35.0.0" "platforms;android-35" "cmdline-tools;latest"

# Install curl to download Node.js
RUN  apt-get install -y curl unzip

# Install Node.js v22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

# Install Yarn
RUN npm install -g yarn
RUN npm install -g eas-cli

# Set working directory
WORKDIR /app