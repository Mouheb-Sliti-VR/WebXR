const fs = require('fs').promises;
const path = require('path');

class VideoService {
    constructor() {
        this.convertedVideosPath = path.resolve('public/videos');
    }

    async handleVideoUpload(file) {
        if (!file) {
            throw new Error('No video file provided');
        }
        return `/videos/${path.basename(file.path)}`;
    }

    async getVideoUrls() {
        try {
            const files = await fs.readdir(this.convertedVideosPath);
            return files
                .filter(file => file.endsWith('.ogv'))
                .map(file => `/videos/${file}`);
        } catch (error) {
            throw new Error(`Error reading video directory: ${error.message}`);
        }
    }

    getVideoUrl(videoName) {
        return `https://webxr-c3su.onrender.com/videos/${videoName}`;
    }
}

module.exports = VideoService;