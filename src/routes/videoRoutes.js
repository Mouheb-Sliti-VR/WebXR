const express = require('express');
const multerConfig = require('../config/multer');
const VideoController = require('../controllers/videoController');

const router = express.Router();
const videoController = new VideoController();

function setVideoRoutes(app) {
    // Upload route: multer saves the file; conversion is handled asynchronously by the service
    router.post('/upload', 
        multerConfig.single('video'),
        videoController.uploadVideo.bind(videoController)
    );
    
    router.get('/videos', videoController.getVideoUrls.bind(videoController));

    // Serve static video files
    app.use('/videos', express.static('public/videos'));
    
    // API routes
    app.use('/api/videos', router);
}

module.exports = setVideoRoutes;