const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME environment variable is not set');
}

// Configure fluent-ffmpeg to use the static binary
ffmpeg.setFfmpegPath(ffmpegPath);

const ffmpegConverter = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const inputFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const inputPath = path.join(os.tmpdir(), inputFilename);

    const outputFilename = `${path.parse(inputFilename).name}.ogv`;
    const outputPath = path.join(os.tmpdir(), outputFilename);

    // Write uploaded MP4 to /tmp
    await fs.writeFile(inputPath, req.file.buffer);

    // Predictive public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/videos/${outputFilename}`;
    req.pendingVideoUrl = publicUrl;

    // Convert in background
    (async () => {
      try {
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
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        // Upload OGV to GCS
        const bucket = storage.bucket(bucketName);
        await bucket.upload(outputPath, {
          destination: `videos/${outputFilename}`,
          public: true,
        });

        console.log(`✅ Uploaded ${outputFilename} to GCS`);

        // Cleanup
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});

      } catch (err) {
        console.error('❌ Conversion error:', err.message);
      }
    })();

    next();
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).send('Error processing upload');
  }
};

module.exports = ffmpegConverter;
