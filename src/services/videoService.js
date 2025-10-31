const { Storage } = require('@google-cloud/storage');

class VideoService {
    constructor() {
        this.bucketName = process.env.GCS_BUCKET_NAME;
        if (!this.bucketName) {
            console.warn('GCS_BUCKET_NAME not set. Video listing/upload will fail.');
        }
        this.storage = new Storage();
    }

    // List .ogv files in GCS and return public URLs
    async getVideoUrls() {
        if (!this.bucketName) throw new Error('GCS_BUCKET_NAME not configured');

        try {
            const bucket = this.storage.bucket(this.bucketName);
            const [files] = await bucket.getFiles({ prefix: 'videos/' });

            const urls = files
                .filter(f => f.name.toLowerCase().endsWith('.ogv'))
                .map(f => `https://storage.googleapis.com/${this.bucketName}/${f.name}`);

            return urls;
        } catch (error) {
            throw new Error(`Error listing videos from GCS: ${error.message}`);
        }
    }

    // Check if a specific video exists
    async checkVideoStatus(videoName) {
        if (!this.bucketName) throw new Error('GCS_BUCKET_NAME not configured');

        try {
            const filePath = `videos/${videoName}`;
            const file = this.storage.bucket(this.bucketName).file(filePath);
            const [exists] = await file.exists();

            if (exists) {
                return {
                    status: 'completed',
                    videoUrl: `https://storage.googleapis.com/${this.bucketName}/${filePath}`
                };
            }

            // Still processing (conversion not finished)
            return { status: 'processing', videoUrl: null };
        } catch (error) {
            throw new Error(`Error checking video status: ${error.message}`);
        }
    }
}

module.exports = VideoService;
