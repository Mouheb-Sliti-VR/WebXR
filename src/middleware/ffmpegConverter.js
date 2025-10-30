const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

const convertVideo = async (inputPath, outputPath) => {
    console.log('Converting:', path.basename(inputPath));

    const ffmpeg = spawn('ffmpeg', [
        '-y',                // overwrite output
        '-loglevel', 'error', // only show errors
        '-stats_period', '5', // show progress every 5 seconds
        '-i', inputPath,
        '-c:v', 'libtheora',
        '-c:a', 'libvorbis',
        '-q:v', '7',
        '-q:a', '4',
        outputPath
    ]);

    let lastProgress = Date.now();

    // Handle FFmpeg output
    ffmpeg.stderr.on('data', chunk => {
        const output = chunk.toString();
        if (output.toLowerCase().includes('error') || 
            (output.includes('frame=') && Date.now() - lastProgress > 5000)) {
            console.log('FFmpeg:', output.trim());
            lastProgress = Date.now();
        }
    });

    // Wait for conversion to complete
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

        // Sanitize filename and create paths
        const sanitizedFilename = req.file.filename.replace(/\s+/g, '_');
        const inputPath = path.resolve(req.file.path);
        const outputFilename = `${path.parse(sanitizedFilename).name}.ogv`;
        const outputPath = path.resolve(__dirname, '../../public/videos', outputFilename);

        // Set the pending video URL immediately (pointing to where it will be in GCS)
        req.originalVideoPath = inputPath;
        if (bucketName) {
            req.pendingVideoUrl = `https://storage.googleapis.com/${bucketName}/videos/${outputFilename}`;
        } else {
            req.pendingVideoUrl = `/videos/${outputFilename}`;
        }

        // Start conversion process in the background
        (async () => {
            try {
                // Ensure directories exist
                await fs.mkdir(path.dirname(outputPath), { recursive: true });

                // Convert the video
                await convertVideo(inputPath, outputPath);

                // Upload converted .ogv to GCS if configured
                if (bucketName) {
                    try {
                        const destination = `videos/${outputFilename}`;
                        await storage.bucket(bucketName).upload(outputPath, {
                            destination,
                            // make public; if you prefer private, remove this and use signed URLs
                            public: true
                        });
                        console.log('Uploaded to GCS:', destination);
                    } catch (uploadErr) {
                        console.error('GCS upload error:', uploadErr.message);
                    }
                }

                // Clean up original and converted local files after successful conversion/upload
                try {
                    await fs.unlink(inputPath);
                } catch (err) {
                    console.warn('Failed to remove original file:', err.message);
                }

                try {
                    await fs.unlink(outputPath);
                } catch (err) {
                    console.warn('Failed to remove converted file:', err.message);
                }

                console.log('Finished converting and cleanup:', path.basename(outputPath));
            } catch (error) {
                console.error('Background conversion error:', error.message);
                // You might want to implement a status endpoint to check conversion status
            }
        })();

        next();
    } catch (error) {
        console.error('Upload error:', error.message);
        res.status(500).send('Error processing upload');
    }
};

module.exports = ffmpegConverter;