const express = require('express');
const multerConfig = require('../config/multer');
const VideoController = require('../controllers/videoController');
const VideoService = require('../services/videoService');
const ffmpegConverter = require('../middleware/ffmpegConverter');

const router = express.Router();
const videoService = new VideoService();
const videoController = new VideoController(videoService);

function setVideoRoutes(app) {
    // New route: upload raw MP4 (no conversion)
    router.post(
        '/upload/raw',
        multerConfig.single('video'),
        videoController.uploadRawVideo.bind(videoController)
    );

    // Existing routes
    router.post(
        '/upload',
        multerConfig.single('video'),
        ffmpegConverter,
        videoController.uploadVideo.bind(videoController)
    );

    router.get('/videos', videoController.getVideos.bind(videoController));
    router.get('/status/:videoUrl', videoController.checkVideoStatus.bind(videoController));

    app.use('/api/videos', router);

    app.get('/health-check', (req, res) => res.send('OK'));
}

module.exports = setVideoRoutes;
