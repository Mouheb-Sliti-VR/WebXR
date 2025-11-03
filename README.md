# WebXR Video API

Simple Node.js service to upload videos, convert MP4 → OGV (optional) and store files in Google Cloud Storage (GCS). Works locally (stores to `public/videos`) or in Cloud Run (uploads to GCS).

## Project layout (important files)

- src/app.js — Express app bootstrap
- src/routes/videoRoutes.js — routes mount (`/api/videos`)
- src/controllers/videoController.js — request handlers
- src/services/videoService.js — GCS integration (upload/list/status)
- src/middleware/ffmpegConverter.js — conversion and upload logic
- src/config/multer.js — multer (memory storage) and validation
- src/utils/logger.js — logging (winston)
- public/videos — local static serve folder (used in local dev)

## Environment variables

Create a `.env` (or set env vars in Cloud Run):

Required for production (GCS):

- GCS_BUCKET_NAME — GCS bucket name where converted `.ogv` files (and raw uploads) are stored
- GOOGLE_APPLICATION_CREDENTIALS — absolute path to service account JSON on the container (or use built-in GCP service accounts)

Optional / local:

- PORT — server port (default 8080)
- UPLOAD_DIR — (optional) local uploads dir if you need custom local path

Service account requirements (for Cloud Run / local credential file):

- storage.objects.create, storage.objects.get / storage.objects.list (or storage.admin) on the target bucket
- logging permissions for build / deploy (Cloud Build service account may need `roles/logging.logWriter`)

## API endpoints

Base path: `/api/videos`

- POST /api/videos/upload
  - Multipart form upload. Field name: `video`
  - Behavior: accepts MP4/MOV, the middleware sets a predictive URL and starts conversion to `.ogv`. When GCS configured, the final `.ogv` is uploaded to `videos/<name>.ogv` in the bucket.
  - Response (202 Accepted or 200 depending implementation): JSON with `pendingVideoUrl` or `videoUrl` and `status` (`processing` | `completed`).

  Example:

  ```bash
  curl -X POST -F "video=@/path/video0.mp4" https://<host>/api/videos/upload
  ```

- POST /api/videos/upload/raw
  - Multipart form upload. Field name: `video`
  - Behavior: does NOT convert. Uploads original file to GCS at `uploads/<timestamp>-<name>.mp4` and returns public URL.
  - Response: 201 JSON `{ success: true, videoUrl: "https://storage.googleapis.com/..." }`

  Example:
  ```curl -X POST -F "video=@/path/video0.mp4" https://<host>/api/videos/upload/raw```

- GET /api/videos/videos
  - Lists available video URLs (both `.ogv` and `.mp4`) from the configured GCS bucket (under any path). If no GCS configured, lists files from local `public/videos`.
  - Response: `{ success: true, videos: [ "https://storage.googleapis.com/...", "/videos/foo.ogv" ] }`

  Example:
  ```curl https://<host>/api/videos/videos```

- GET /api/videos/status/:videoName
  - Check processing status for a given filename or URL segment. Returns `{ success: true, status: "processing"|"completed", videoUrl: "<public-url>|null" }`

  Example:
  ```curl https://<host>/api/videos/status/video0.ogv```

## Local development

1. Install
   ```npm install```
2. Create `.env` with required vars (optional for local):

```PORT=8080
   GCS_BUCKET_NAME=           # empty to use local public/videos
   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json```
3. Start:
   ```npm start```
4. Local static serve:
   - Converted OGVs are saved to `public/videos` (when no GCS bucket configured) and are served at `http://localhost:8080/videos/<file>.ogv`.

## Cloud Run / Production notes

- Recommended: use GCS for persistent storage. Set `GCS_BUCKET_NAME` and provide credentials or use an attached service account with appropriate IAM roles.
- Conversion is CPU-heavy. Recommended production approach:
  - Upload original MP4 to `uploads/` in GCS immediately, then trigger a worker (Cloud Function / Cloud Run triggered by GCS events or Pub/Sub) to do conversion and write `videos/`.
  - Or keep a dedicated worker service with `min-instances=1` if you must convert inside the same service (costly).
  
- Example deploy (buildpacks):
  ```gcloud run deploy video-api --source . \
    --platform managed --region europe-west1 \
    --allow-unauthenticated \
    --set-env-vars "GCS_BUCKET_NAME=your-bucket" \
    --project your-project-id```

  If buildpacks fail (ffmpeg-static or native deps), use the provided Dockerfile that installs `ffmpeg` system package.

## Troubleshooting & logs

- Check Cloud Run logs in Cloud Console for conversion / upload errors.
- Ensure service account used by Cloud Run has `storage.objects.create` and `storage.objects.get` on the bucket.
- If uploads appear to hang or conversions are extremely slow:
  - Do not run long conversions in the HTTP request background — Cloud Run instances can be suspended. Use an async worker triggered by GCS events, or set `min-instances=1`.
  - Lower conversion quality or change ffmpeg flags to speed up conversion if acceptable.

## Security & production hardening

- Consider making uploaded objects private and returning signed URLs instead of public objects.
- Validate uploads thoroughly (file type, size).
- Add authentication to upload endpoints if required.

## Notes

- Multer uses memoryStorage by default (suitable for Cloud Run). File size limit is configured in `src/config/multer.js` (100MB).
- Videos go to:
  - GCS: `uploads/` (raw uploads) and `videos/` (converted OGVs)
  - Local dev: `public/videos`
