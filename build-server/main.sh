#!/bin/bash

set -e  # Exit on error

if [ -z "$GIT_REPOSITORY_URL" ]; then
    echo "Error: GIT_REPOSITORY_URL is not set."
    exit 1
fi

echo "Cloning repository: $GIT_REPOSITORY_URL"
git clone "$GIT_REPOSITORY_URL" /home/app/output

cd /home/app/output

echo "Running node script..."
exec node /home/app/script.js