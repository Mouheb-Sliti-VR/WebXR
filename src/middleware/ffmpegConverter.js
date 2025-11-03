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

// Configure fluent-ffmpeg to use the static binary
ffmpeg.setFfmpegPath(ffmpegPath);

const ffmpegConverter = async (req, res, next) => {
  try {
    if (!req.file) {
      logger.warn('No file provided in request');
      return res.status(400).send('No file uploaded.');
    }

    const inputFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const inputPath = path.join(os.tmpdir(), inputFilename);
    const outputFilename = `${path.parse(inputFilename).name}.ogv`;
    const outputPath = path.join(os.tmpdir(), outputFilename);

    logger.info('Starting video processing', {
      originalName: req.file.originalname,
      inputPath,
      outputPath,
      fileSize: req.file.size
    });

    // Write uploaded MP4 to /tmp
    await fs.writeFile(inputPath, req.file.buffer);
    logger.debug('Temporary input file written', { inputPath });

    // Predictive public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/videos/${outputFilename}`;
    req.pendingVideoUrl = publicUrl;
    logger.debug('Generated pending video URL', { publicUrl });

    // Convert in background
    (async () => {
      try {
        logger.info('Starting video conversion', { inputPath, outputPath });
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions([
              '-c:v libtheora',
              '-c:a libvorbis',
              '-q:v 5',
              '-q:a 4',
              '-threads 0'
            ])
            .output(outputPath)
            .on('start', (commandLine) => {
              logger.debug('FFmpeg conversion started', { commandLine });
            })
            .on('progress', (progress) => {
              logger.debug('FFmpeg conversion progress', {
                percent: progress.percent,
                frames: progress.frames,
                fps: progress.currentFps,
                timemark: progress.timemark
              });
            })
            .on('end', () => {
              logger.info('Video conversion completed', { outputPath });
              resolve();
            })
            .on('error', (err) => {
              logger.error('FFmpeg conversion error', { 
                error: err.message, 
                stack: err.stack 
              });
              reject(err);
            })
            .run();
        });

        // Upload OGV to GCS
        const bucket = storage.bucket(bucketName);
        logger.info('Starting GCS upload', { 
          bucket: bucketName,
          destination: `videos/${outputFilename}`
        });

        await bucket.upload(outputPath, {
          destination: `videos/${outputFilename}`,
          public: true,
        });

        logger.info('Video uploaded successfully to GCS', { 
          filename: outputFilename,
          publicUrl
        });

        // Cleanup
        await fs.unlink(inputPath).catch((err) => {
          logger.warn('Failed to delete input file', { 
            path: inputPath, 
            error: err.message 
          });
        });
        await fs.unlink(outputPath).catch((err) => {
          logger.warn('Failed to delete output file', { 
            path: outputPath, 
            error: err.message 
          });
        });

      } catch (err) {
        logger.error('Video processing failed', {
          error: err.message,
          stack: err.stack,
          inputPath,
          outputPath
        });
      }
    })();

    next();
  } catch (error) {
    logger.error('Upload request failed', {
      error: error.message,
      stack: error.stack,
      filename: req.file?.originalname
    });
    res.status(500).send('Error processing upload');
  }
};

module.exports = ffmpegConverter;
