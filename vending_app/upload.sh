#!/bin/bash

# --- Configuration ---
CLIENT_ID="1815555533982181056" # Replace with your Client ID from AppGallery Connect API client
CLIENT_SECRET="FDF498BC55C4D6B53D4DA4FAA4EE3FA16844C947AF0D85C5FCA1FE6BECFAA5AF" # Replace with your Client Secret
APP_ID="115473181" # Replace with your App ID
AAB_FILE_PATH="apks/build.aab" # Replace with the actual path to your AAB file

# --- Obtain Access Token ---
echo "Obtaining access token..."
AUTH_RESPONSE=$(curl -s -X POST \
  "https://connect-api.cloud.huawei.com/api/oauth2/v1/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": \"$CLIENT_ID\",
    \"client_secret\": \"$CLIENT_SECRET\",
    \"grant_type\": \"client_credentials\"
  }")

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to obtain access token. Exiting."
  exit 1
fi
echo "Access token obtained."

# --- Get Upload URL and Auth Code ---
echo "Getting upload URL and auth code..."
UPLOAD_INIT_RESPONSE=$(curl -s -X POST \
  "https://connect-api.cloud.huawei.com/api/publish/v2/upload-url/for-obs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "client_id: $CLIENT_ID" \
  -d "{
    \"appId\": \"$APP_ID\",
    \"fileName\": \"build.aab\",
    \"contentLength\": $(wc -c < "$AAB_FILE_PATH")
  }")

echo $UPLOAD_INIT_RESPONSE;
UPLOAD_URL=$(echo "$UPLOAD_INIT_RESPONSE" | jq -r '.result.UploadFileRsp.fileInfoList[0].disposableURL')
AUTH_CODE=$(echo "$UPLOAD_INIT_RESPONSE" | jq -r '.result.UploadFileRsp.fileInfoList[0].authCode')

if [ -z "$UPLOAD_URL" ] || [ -z "$AUTH_CODE" ]; then
  echo "Failed to get upload URL or auth code. Exiting."
  exit 1
fi
echo "Upload URL and auth code obtained."

# --- Upload the AAB File ---
echo "Uploading AAB file..."
UPLOAD_FILE_RESPONSE=$(curl -s -X POST \
  "$UPLOAD_URL" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$AAB_FILE_PATH" \
  -F "authCode=$AUTH_CODE" \
  -F "fileCount=1")

UPLOAD_SUCCESS=$(echo "$UPLOAD_FILE_RESPONSE" | jq -r '.result.UploadFileRsp.ifSuccess')

if [ "$UPLOAD_SUCCESS" -eq 1 ]; then
  echo "AAB file uploaded successfully."
else
  echo "AAB file upload failed. Response:"
  echo "$UPLOAD_FILE_RESPONSE"
  exit 1
fi

# --- Update App File Information ---
echo "Updating app file information..."
FILE_SERVER_URL=$(echo "$UPLOAD_INIT_RESPONSE" | jq -r '.result.UploadFileRsp.fileInfoList[0].fileServerUrl')
FILE_DEST_URL=$(echo "$UPLOAD_INIT_RESPONSE" | jq -r '.result.UploadFileRsp.fileInfoList[0].fileDestUrl')

UPDATE_RESPONSE=$(curl -s -X PUT \
  "https://connect-api.cloud.huawei.com/api/publish/v2/app-file-info" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "client_id: $CLIENT_ID" \
  -d "{
    \"appId\": \"$APP_ID\",
    \"fileType\": 5,
    \"files\": [{
      \"fileName\": \"build.aab\",
      \"fileDestUrl\": \"$FILE_DEST_URL\",
      \"fileServerUrl\": \"$FILE_SERVER_URL\"
    }]
  }")

echo "Update response: $UPDATE_RESPONSE"
echo ""
echo "✅ AAB file uploaded and app file information updated successfully!"
echo "📱 Go to AppGallery Connect to complete the submission process."