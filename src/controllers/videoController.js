const VideoService = require('../services/videoService');
const { logger } = require('../utils/logger');

class VideoController {
    constructor(videoService) {
        this.videoService = videoService;
    }

    // New: upload MP4 directly to GCS uploads/ (no conversion)
    async uploadRawVideo(req, res) {
        try {
            logger.info('Processing raw-upload request', {
                originalname: req?.file?.originalname,
                mimetype: req?.file?.mimetype,
                size: req?.file?.size
            });

            if (!req.file) {
                logger.warn('Raw upload failed: no file in request');
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const publicUrl = await this.videoService.uploadRaw(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );

            logger.info('Raw upload succeeded', { publicUrl });

            return res.status(201).json({
                success: true,
                message: 'Raw MP4 uploaded',
                videoUrl: publicUrl,
                status: 'uploaded'
            });
        } catch (error) {
            logger.error('Raw upload failed', {
                error: error.message,
                stack: error.stack,
                originalname: req?.file?.originalname
            });
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // Upload endpoint returns predictive URL immediately
    async uploadVideo(req, res) {
        try {
            logger.info('Processing video upload request', {
                originalname: req?.file?.originalname,
                mimetype: req?.file?.mimetype,
                size: req?.file?.size
            });

            if (!req.pendingVideoUrl) {
                logger.error('Video upload failed: No pending URL available');
                throw new Error('Video upload failed');
            }

            logger.info('Video upload accepted', { 
                pendingVideoUrl: req.pendingVideoUrl 
            });

            return res.status(202).json({
                success: true,
                message: 'Video uploaded successfully and is being converted',
                pendingVideoUrl: req.pendingVideoUrl,
                status: 'converting'
            });
        } catch (error) {
            logger.error('Video upload failed', {
                error: error.message,
                stack: error.stack,
                originalname: req?.file?.originalname
            });
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    // List all .ogv videos from GCS
    async getVideos(req, res) {
        try {
            logger.info('Fetching video list');
            const videos = await this.videoService.getVideoUrls();
            
            logger.info('Video list retrieved successfully', { 
                count: videos.length 
            });

            return res.status(200).json({ 
                success: true,
                videos
            });
        } catch (error) {
            logger.error('Failed to fetch video list', {
                error: error.message,
                stack: error.stack
            });
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

            logger.info('Checking video status', { videoUrl, videoName });

            if (!videoName) {
                logger.warn('Invalid video status check request: Missing videoUrl');
                return res.status(400).json({ success: false, error: 'videoUrl param required' });
            }

            const status = await this.videoService.checkVideoStatus(videoName);
            
            logger.info('Video status check completed', { 
                videoName,
                status 
            });

            return res.status(200).json({ success: true, ...status });

        } catch (error) {
            logger.error('Video status check failed', {
                error: error.message,
                stack: error.stack,
                videoUrl: req.params.videoUrl
            });
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = VideoController;
