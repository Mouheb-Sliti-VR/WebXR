const VideoService = require('../services/videoService');

class VideoController {
    constructor(videoService) {
        this.videoService = videoService;
    }

    // Upload endpoint returns predictive URL immediately
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

    // List all .ogv videos from GCS
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

    // Check if a specific video exists in GCS
    async checkVideoStatus(req, res) {
        try {
            const { videoUrl } = req.params;
            const videoName = videoUrl ? videoUrl.split('/').pop() : null;

            if (!videoName) {
                return res.status(400).json({ success: false, error: 'videoUrl param required' });
            }

            const status = await this.videoService.checkVideoStatus(videoName);
            return res.status(200).json({ success: true, ...status });

        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = VideoController;
