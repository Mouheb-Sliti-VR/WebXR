const multer = require('multer');
const path = require('path');

// Use memory storage for Cloud Run (stateless)
const storage = multer.memoryStorage();

// File filter to accept only video files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/x-mov', 'video/quicktime'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4 and MOV are allowed.'), false);
  }
};

// Configure Multer with memory storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // Limit file size to 100MB
  },
  fileFilter: fileFilter
});

module.exports = upload;