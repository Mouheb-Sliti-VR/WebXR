const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

const convertVideo = async (inputPath, outputPath) => {
  console.log('Converting:', path.basename(inputPath));

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-c:v', 'libtheora',
    '-c:a', 'libvorbis',
    '-q:v', '7',
    '-q:a', '4',
    outputPath,
  ]);

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', code => {
      if (code !== 0) reject(new Error(`FFmpeg exited with code ${code}`));
      else resolve();
    });
    ffmpeg.on('error', reject);
  });
};

const ffmpegConverter = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const bucket = storage.bucket(bucketName);

    // 1️⃣ Write memory buffer to /tmp
    const inputFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const inputPath = path.join(os.tmpdir(), inputFilename);
    await fs.writeFile(inputPath, req.file.buffer);

    // 2️⃣ Prepare output paths
    const outputFilename = `${path.parse(inputFilename).name}.ogv`;
    const outputPath = path.join(os.tmpdir(), outputFilename);

    // 3️⃣ Public URL (predictive)
    req.pendingVideoUrl = `https://storage.googleapis.com/${bucketName}/videos/${outputFilename}`;

    // 4️⃣ Run conversion in background
    (async () => {
      try {
        await convertVideo(inputPath, outputPath);

        // 5️⃣ Upload to GCS (public)
        await bucket.upload(outputPath, {
          destination: `videos/${outputFilename}`,
          public: true,
        });
        console.log(`✅ Uploaded ${outputFilename} to GCS`);

        // 6️⃣ Cleanup
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
