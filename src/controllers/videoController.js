const VideoService = require('../services/videoService');

class VideoController {
    constructor() {
        this.videoService = new VideoService();
    }

    async uploadVideo(req, res) {
        try {
            const video = req.file;
            if (!video) {
                return res.status(400).json({ message: 'No video file uploaded.' });
            }
            res.status(201).json({
                message: 'Video uploaded and converted successfully.'
            });

            // Start conversion asynchronously in the background. We don't await it here
            // so the client gets an immediate success response.
            this.videoService.convertVideo(video)
                .then(outputPath => console.log('Background conversion completed:', outputPath))
                .catch(err => console.error('Background conversion failed:', err));
        } catch (error) {
            res.status(500).json({ 
                message: 'Error uploading video.',
                error: error.message 
            });
        }
    }

    async getVideoUrls(req, res) {
        try {
            const videoUrls = await this.videoService.getVideoUrls();
            res.status(200).json({ 
                videosUrls: videoUrls 
            });
        } catch (error) {
            res.status(500).json({ 
                message: 'Error retrieving video URLs.',
                error: error.message 
            });
        }
    }
}

module.exports = VideoController;