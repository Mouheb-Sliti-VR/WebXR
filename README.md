# Video Server Project

This project implements a Node.js server that accepts video uploads, converts them to OGV (.ogv) using FFmpeg, uploads converted files to Google Cloud Storage (or serves locally in development), and exposes APIs to list and check conversion status.

## What changed

- Converted videos are now uploaded to Google Cloud Storage (GCS) under the `videos/` prefix (if `GCS_BUCKET_NAME` is configured).
- Upload endpoint responds immediately with a pending URL; conversion and upload happen in the background.
- `GET /api/videos` lists public URLs to converted `.ogv` files in the configured GCS bucket.
- `GET /api/videos/status/:videoUrl` checks whether a converted file exists (by filename or URL segment).

## Project Structure

```video-server
├── src
│   ├── config
│   │   └── multer.js          # Configuration for Multer (disk storage for uploads)
│   ├── controllers
│   │   └── videoController.js  # Controller for video operations
│   ├── middleware
│   │   └── ffmpegConverter.js   # Middleware for video conversion and (GCS) upload
│   ├── routes
│   │   └── videoRoutes.js       # Routes for video uploads and serving
│   ├── services
│   │   └── videoService.js       # Service for listing/checking videos (GCS)
│   ├── utils
│   │   └── helpers.js            # Utility functions
│   └── app.js                    # Entry point of the application
├── uploads                        # Directory for temporary uploads
├── public
│   └── videos                    # Local dev directory for converted videos (also used as temp)
├── package.json                  # NPM configuration file (adds @google-cloud/storage)
├── .env.example                  # Example environment variables
└── README.md                     # Project documentation
```

## Prerequisites

- Node.js (v16+ recommended)
- FFmpeg installed and available on PATH (the server shell must be able to run `ffmpeg`)
- (Optional, for production) Google Cloud project and a GCS bucket if you want durable public hosting of converted videos.

## Environment variables

Create a `.env` file (see `.env.example`) or set these variables in your environment:

- `PORT` — server port (default: 3000)
- `NODE_ENV` — `development` or `production`
- `GCS_BUCKET_NAME` — name of your Google Cloud Storage bucket (optional)
- `GOOGLE_APPLICATION_CREDENTIALS` — path to the service account JSON key file for GCP authentication (used locally or in non-GCP environments)
- `UPLOAD_DIR` — local uploads directory (default: `uploads`)

If you do not set `GCS_BUCKET_NAME`, converted videos will remain local (useful for quick local testing), but listing and status endpoints will require the local files to be present.

## Google Cloud Storage setup (brief)

1. Create a service account with `Storage Object Admin` permissions (or appropriate narrower permissions).
2. Create and download a JSON key for that service account.
3. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to the JSON key file path:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
export GCS_BUCKET_NAME=your-bucket-name
```

On Windows PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\key.json"
$env:GCS_BUCKET_NAME = "your-bucket-name"
```

Ensure the bucket is configured to allow public reads for objects (or adjust the code to generate signed URLs instead).

## Install and run

```powershell
npm install
npm start
```

## API

### Upload Video

- Endpoint: `POST /api/videos/upload`
- Request: multipart/form-data with field `video` (file)
- Response (202 Accepted):

```json
{
  "success": true,
  "message": "Video uploaded successfully and is being converted",
  "pendingVideoUrl": "https://storage.googleapis.com/<bucket>/videos/<filename>.ogv",
  "status": "converting"
}
```

The server responds immediately. Conversion and upload to GCS happen in the background.

### List Videos

- Endpoint: `GET /api/videos/videos`
- Response:

```json
{
  "success": true,
  "videos": [
    "https://storage.googleapis.com/<bucket>/videos/video1.ogv",
    "https://storage.googleapis.com/<bucket>/videos/video2.ogv"
  ]
}
```

### Check Video Status

- Endpoint: `GET /api/videos/status/:videoUrl`
- `:videoUrl` may be either the filename (e.g. `video1.ogv`) or a URL segment. The server extracts the basename and checks GCS for `videos/<basename>`.
- Response examples:

Processing:

```json
{ "success": true, "status": "converting" }
```

Completed:

```json
{ "success": true, "status": "completed", "videoUrl": "https://storage.googleapis.com/<bucket>/videos/video1.ogv" }
```
