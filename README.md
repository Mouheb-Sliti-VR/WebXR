# Video Server Project

This project implements a Node.js server that allows users to upload videos, convert them to .ovg format using FFmpeg, and serve the converted videos. The server is built using Express and utilizes Multer for handling file uploads.

## Project Structure

```
video-server
├── src
│   ├── config
│   │   └── multer.js          # Configuration for Multer
│   ├── controllers
│   │   └── videoController.js  # Controller for video operations
│   ├── middleware
│   │   └── ffmpegConverter.js   # Middleware for video conversion
│   ├── routes
│   │   └── videoRoutes.js       # Routes for video uploads and serving
│   ├── services
│   │   └── videoService.js       # Service for managing videos
│   ├── utils
│   │   └── helpers.js            # Utility functions
│   └── app.js                    # Entry point of the application
├── uploads                        # Directory for temporary uploads
├── public
│   └── videos                    # Directory for serving converted videos
├── package.json                  # NPM configuration file
└── README.md                     # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd video-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the server:**
   ```bash
   npm start
   ```

## API Usage

### Upload Video

- **Endpoint:** `POST /api/videos/upload`
- **Description:** Uploads a video file.
- **Request Body:** Form-data with a file field named `video`.

### Get Video URLs

- **Endpoint:** `GET /api/videos`
- **Description:** Retrieves URLs of the converted videos.

## Dependencies

- Express
- Multer
- FFmpeg

## License

This project is licensed under the MIT License.