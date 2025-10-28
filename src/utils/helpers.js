// src/utils/helpers.js

const path = require('path');

function generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}-${timestamp}${ext}`;
}

function isValidVideoFormat(file) {
    const validFormats = ['video/mp4', 'video/quicktime'];
    return validFormats.includes(file.mimetype);
}

module.exports = {
    generateUniqueFilename,
    isValidVideoFormat,
};