const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { Storage } = require('@google-cloud/storage');
const { logger } = require('../utils/logger');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME environment variable is not set');
}

// Use static ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

const ffmpegConverter = async (req, res, next) => {
  try {
    if (!req.file) {
      logger.warn('No file provided in request');
      return res.status(400).send('No file uploaded.');
    }

    // Prepare filenames and temp paths
    const inputFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const outputFilename = `${path.parse(inputFilename).name}.ogv`;
    const inputPath = path.join(os.tmpdir(), inputFilename);
    const outputPath = path.join(os.tmpdir(), outputFilename);

    const bucket = storage.bucket(bucketName);
    const uploadDest = `uploads/${inputFilename}`;
    const convertedDest = `videos/${outputFilename}`;
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${convertedDest}`;
    req.pendingVideoUrl = publicUrl;

    logger.info('Starting video processing', {
      originalName: req.file.originalname,
      inputPath,
      outputPath,
      uploadDest,
      convertedDest
    });

    // Save uploaded MP4 temporarily
    await fs.writeFile(inputPath, req.file.buffer);

    // Upload raw MP4 only once to "uploads/"
    await bucket.upload(inputPath, {
      destination: uploadDest,
      public: false
    });
    logger.info('Uploaded raw MP4 to GCS', { uploadDest });

    // Start conversion in background
    (async () => {
      try {
        logger.info('Starting FFmpeg conversion', { inputPath, outputPath });
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions([
              '-c:v libtheora',
              '-c:a libvorbis',
              '-q:v 4',
              '-q:a 4',
              '-preset ultrafast',
              '-threads 0'
            ])
            .on('start', cmd => logger.debug('FFmpeg command', { cmd }))
            .on('progress', p => logger.debug('FFmpeg progress', { percent: p.percent?.toFixed(2) }))
            .on('end', resolve)
            .on('error', reject)
            .save(outputPath);
        });

        // Upload converted .ogv to "videos/"
        await bucket.upload(outputPath, {
          destination: convertedDest,
          public: true
        });
        logger.info('OGV uploaded successfully', { publicUrl });

      } catch (err) {
        logger.error('FFmpeg conversion failed', { error: err.message });
      } finally {
        // Always clean up temp files
        await Promise.all([
          fs.unlink(inputPath).catch(() => {}),
          fs.unlink(outputPath).catch(() => {})
        ]);
      }
    })().catch(err => logger.error('Async worker crash', { error: err.message }));

    // Continue request flow immediately
    next();

  } catch (err) {
    logger.error('Upload request failed', {
      error: err.message,
      stack: err.stack,
      filename: req.file?.originalname
    });
    res.status(500).send('Error processing upload');
  }
};

module.exports = ffmpegConverter;
