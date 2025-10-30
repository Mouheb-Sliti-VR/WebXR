const express = require('express');
const path = require('path');
const videoRoutes = require('./routes/videoRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

// Create required directories if they don't exist
const fs = require('fs');
const dirs = ['uploads', 'public/videos'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Middleware
app.use(express.json());

// Routes
videoRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: err.message 
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Upload videos at http://localhost:${PORT}/api/videos/upload`);
    console.log(`Get video list at http://localhost:${PORT}/api/videos/videos`);
});