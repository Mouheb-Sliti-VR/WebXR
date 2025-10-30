const express = require('express');
const multerConfig = require('../config/multer');
const VideoController = require('../controllers/videoController');
const VideoService = require('../services/videoService');
const ffmpegConverter = require('../middleware/ffmpegConverter');

const router = express.Router();
const videoService = new VideoService();
const videoController = new VideoController(videoService);

function setVideoRoutes(app) {
    // Upload route: multer saves the file, ffmpeg converts it, then controller handles the response
    router.post('/upload', 
        multerConfig.single('video'),
        ffmpegConverter,
        videoController.uploadVideo.bind(videoController)
    );
    
    router.get('/videos', videoController.getVideos.bind(videoController));
    
    // Check video conversion status
    router.get('/status/:videoUrl', videoController.checkVideoStatus.bind(videoController));

    // Serve static video files
    app.use('/videos', express.static('public/videos'));
    
    // API routes
    app.use('/api/videos', router);
}

module.exports = setVideoRoutes;