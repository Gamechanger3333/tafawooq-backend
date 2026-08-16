const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.resolve("tmp");

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // Use a random suffix instead of the raw original filename to avoid
        // path traversal / overwrite issues and to stop leaking the
        // uploader's original file naming into a predictable public path.
        const ext = path.extname(file.originalname).slice(0, 20);
        const safeExt = /^[a-zA-Z0-9.]*$/.test(ext) ? ext : "";

        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
    },
});

// Only allow the file types this app actually needs (images, videos, and
// common document formats for assignments/CVs). Anything else is rejected
// before it ever touches disk.
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }

    cb(null, true);
};

const uploadOnMulter = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB per file
        files: 5,
    },
});

module.exports = { uploadOnMulter };
