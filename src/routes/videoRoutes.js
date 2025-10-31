const express = require('express');
const multerConfig = require('../config/multer');
const VideoController = require('../controllers/videoController');
const VideoService = require('../services/videoService');
const ffmpegConverter = require('../middleware/ffmpegConverter');

const router = express.Router();
const videoService = new VideoService();
const videoController = new VideoController(videoService);

function setVideoRoutes(app) {
    // 1️⃣ Upload route: multer saves file in memory, ffmpeg converts to OGV, controller returns URL
    router.post(
        '/upload',
        multerConfig.single('video'),
        ffmpegConverter,
        videoController.uploadVideo.bind(videoController)
    );

    // 2️⃣ Get all videos (list of OGV URLs)
    router.get('/videos', videoController.getVideos.bind(videoController));

    // 3️⃣ Check video conversion status
    router.get('/status/:videoUrl', videoController.checkVideoStatus.bind(videoController));

    // 4️⃣ Mount API routes under /api/videos
    app.use('/api/videos', router);

    // 5️⃣ Optional health check for Cloud Run
    app.get('/health-check', (req, res) => res.send('OK'));
}

module.exports = setVideoRoutes;
