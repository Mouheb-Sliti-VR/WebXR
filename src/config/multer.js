const multer = require('multer');
const path = require('path');

// Set storage options for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const base = Date.now() + '-' + Math.round(Math.random()*1e9);
    // keep original name but sanitize: remove/replace spaces and unsafe chars
    const cleanName = file.originalname
      .normalize('NFKD')
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, ''); // keep letters, numbers, underscore, dot, dash
    cb(null, `${base}-${cleanName}`);
  }
});

// File filter to accept only video files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/x-mov', 'video/quicktime'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Invalid file type. Only MP4 and MOV are allowed.'), false); // Reject file
  }
};

// Configure Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // Limit file size to 100MB
  },
  fileFilter: fileFilter
});

module.exports = upload;