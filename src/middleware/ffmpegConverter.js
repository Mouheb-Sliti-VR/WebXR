const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

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

        // Ensure directories exist
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Convert the video
        await convertVideo(inputPath, outputPath);

        // Clean up original file
        try {
            await fs.unlink(inputPath);
        } catch (err) {
            console.warn('Failed to remove original file:', err.message);
        }

        console.log('Finished converting:', path.basename(outputPath));
        req.convertedVideoUrl = `/videos/${outputFilename}`;
        next();
    } catch (error) {
        console.error('Conversion error:', error.message);
        res.status(500).send('Error during video conversion');
    }
};

module.exports = ffmpegConverter;