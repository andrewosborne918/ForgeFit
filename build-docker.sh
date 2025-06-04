#!/bin/bash

# Build Docker image with Firebase environment variables
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAlVd-8KdKlkLFtqoW7toUvCkR_G3Kxb4Y" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="forgefit-k1uia.firebaseapp.com" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="forgefit-k1uia" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="forgefit-k1uia.firebasestorage.app" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1074051143809" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="1:1074051143809:web:0de0c02560ae7e4a075580" \
  -t forgefit:latest .

echo "Docker build completed!"
