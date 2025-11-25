const multer = require("multer");
const path = require("path"); // Added to correctly resolve file paths

// Define the absolute path to the uploads folder from the project root
const UPLOADS_DIR = path.join(__dirname,"../uploads");

const diskStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        // FIX 1: Use a reliable, absolute path to ensure the folder exists and is accessible.
        cb(null, UPLOADS_DIR);
    },
    filename: function(req, file, cb) {
        // Get the original filename without extension
        const originalName = file.originalname.split('.')[0];
        const fileExtension = path.extname(file.originalname);

        // FIX 2: Corrected the filename syntax to avoid the 'user-file' reference.
        // We'll use the user ID later, but for now, we use a unique timestamp prefix.
        const uniqueFileName = `${originalName}-${Date.now()}${fileExtension}`;
        
        cb(null, uniqueFileName);
    }
});

const fileFilter = (req, file, cb) => {
    const fileType = file.mimetype.split('/')[0];
    if (fileType === 'image') {
        cb(null, true);
    } else {
        // It's generally better to reject the file with a clear error
        cb(new Error('File type is not supported, only images are allowed.'), false);
    }
};

const upload = multer({ 
    storage: diskStorage, 
    fileFilter: fileFilter,
    // Max file size 5MB (optional but recommended)
    limits: { fileSize: 1024 * 1024 * 5 }
});

module.exports = upload;