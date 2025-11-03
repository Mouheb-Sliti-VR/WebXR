const { Storage } = require('@google-cloud/storage');
const { logger } = require('../utils/logger');
const path = require('path');

class VideoService {
    constructor() {
        this.bucketName = process.env.GCS_BUCKET_NAME;
        if (!this.bucketName) {
            logger.warn('GCS_BUCKET_NAME environment variable not set', {
                message: 'Video listing/upload will fail'
            });
        }
        this.storage = new Storage();
        logger.info('VideoService initialized', { bucketName: this.bucketName });
    }

    // Upload raw file buffer to GCS uploads/ and return public URL
    async uploadRaw(buffer, originalName, contentType) {
        if (!this.bucketName) {
            const msg = 'GCS_BUCKET_NAME not configured';
            logger.error(msg);
            throw new Error(msg);
        }
        const safeName = `${Date.now()}-${originalName.replace(/\s+/g,'_')}`;
        const dest = `uploads/${safeName}`;
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(dest);
            await file.save(buffer, {
                metadata: { contentType },
                public: true
            });
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${dest}`;
            logger.info('Uploaded raw file to GCS', { dest, publicUrl });
            return publicUrl;
        } catch (error) {
            logger.error('Failed to upload raw file to GCS', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    // List .ogv and .mp4 files in GCS and return public URLs
    async getVideoUrls() {
        if (!this.bucketName) {
            logger.error('Cannot list videos: GCS_BUCKET_NAME not configured');
            throw new Error('GCS_BUCKET_NAME not configured');
        }

        try {
            logger.info('Fetching video files from GCS', { bucket: this.bucketName });
            const bucket = this.storage.bucket(this.bucketName);
            const [files] = await bucket.getFiles();

            const videoFiles = files.filter(f => {
                const name = f.name.toLowerCase();
                return name.endsWith('.ogv') || name.endsWith('.mp4');
            });

            logger.debug('Filtered video files', { totalFiles: files.length, videoFiles: videoFiles.length });

            const urls = videoFiles.map(f =>
                `https://storage.googleapis.com/${this.bucketName}/${f.name}`
            );

            logger.info('Video URLs retrieved successfully', { count: urls.length });

            return urls;
        } catch (error) {
            logger.error('Failed to list videos from GCS', {
                error: error.message,
                stack: error.stack,
                bucket: this.bucketName
            });
            throw new Error(`Error listing videos from GCS: ${error.message}`);
        }
    }

    // Check if a specific video exists
    async checkVideoStatus(videoName) {
        if (!this.bucketName) {
            logger.error('Cannot check video status: GCS_BUCKET_NAME not configured');
            throw new Error('GCS_BUCKET_NAME not configured');
        }

        try {
            const filePath = videoName;
            logger.info('Checking video status in GCS', { 
                bucket: this.bucketName,
                filePath 
            });

            const file = this.storage.bucket(this.bucketName).file(filePath);
            const [exists] = await file.exists();

            if (exists) {
                const videoUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
                logger.info('Video found in GCS', { 
                    status: 'completed',
                    videoUrl 
                });
                return {
                    status: 'completed',
                    videoUrl
                };
            }

            logger.info('Video not found in GCS', { 
                status: 'processing',
                filePath 
            });
            // Still processing (conversion not finished)
            return { status: 'processing', videoUrl: null };
        } catch (error) {
            logger.error('Failed to check video status', {
                error: error.message,
                stack: error.stack,
                videoName,
                bucket: this.bucketName
            });
            throw new Error(`Error checking video status: ${error.message}`);
        }
    }
}

module.exports = VideoService;
