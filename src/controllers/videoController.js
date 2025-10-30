const VideoService = require('../services/videoService');

class VideoController {
    constructor(videoService) {
        this.videoService = videoService;
    }

    async uploadVideo(req, res) {
        try {
            if (!req.pendingVideoUrl) {
                throw new Error('Video upload failed');
            }
            return res.status(202).json({
                success: true,
                message: 'Video uploaded successfully and is being converted',
                pendingVideoUrl: req.pendingVideoUrl,
                status: 'converting'
            });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    async getVideos(req, res) {
        try {
            const videos = await this.videoService.getVideoUrls();
            return res.status(200).json({ 
                success: true,
                videos
            });
        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    async checkVideoStatus(req, res) {
        try {
            const { videoUrl } = req.params; // expected param is filename or URL segment
            // extract basename in case a full URL was passed
            const name = videoUrl ? videoUrl.split('/').pop() : null;
            if (!name) return res.status(400).json({ success: false, error: 'videoUrl param required' });
            const status = await this.videoService.checkVideoStatus(name);
            return res.status(200).json(Object.assign({ success: true }, status));
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = VideoController;