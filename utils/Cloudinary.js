const cloudinary = require("cloudinary").v2;
const { extractPublicId } = require("cloudinary-build-url");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_SECRET_KEY } =
    process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_SECRET_KEY) {
    console.error("Missing Cloudinary configuration in environment variables.");
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_SECRET_KEY,
});

/**
 * Helper function to delete local files after Cloudinary upload.
 * @param {string} filePath - The local path of the file to delete.
 */
const deleteLocalFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Error deleting file: ${filePath}`, err);
        } else {
            console.log(`Successfully deleted file: ${filePath}`);
        }
    });
};

/**
 * Uploads a single file to Cloudinary with default options.
 * @param {string} filePath - Local file path to upload.
 * @param {object} options - Additional Cloudinary upload options.
 * @returns {object|null} - Uploaded file info or null on failure.
 */
const uploadFileToCloudinary = async (filePath, options = {}) => {
    try {
        if (!filePath) return null;

        const uploadedFile = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
            folder: "general",
            ...options,
        });
        deleteLocalFile(filePath);

        return uploadedFile;
    } catch (error) {
        console.error(`Cloudinary File Upload Error ==> ${error.message}`);
        deleteLocalFile(filePath);
        return null;
    }
};

/**
 * Deletes a single file from Cloudinary with a default resource type.
 * @param {string} fileUrl - URL of the file to delete on Cloudinary.
 * @param {string} resourceType - Resource type of the file (default is "image").
 * @returns {object|null} - Deletion result or null on failure.
 */
const deleteFileFromCloudinary = async (fileUrl, resourceType = "image") => {
    const publicId = extractPublicId(fileUrl);

    try {
        const deletedFile = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });

        return deletedFile;
    } catch (error) {
        console.error(`Cloudinary File Delete Error ==> ${error.message}`);
        return null;
    }
};

/**
 * Uploads multiple files to Cloudinary with default options.
 * @param {Array<string>} filePaths - List of local file paths to upload.
 * @param {object} options - Additional Cloudinary upload options.
 * @returns {Array<object|null>} - Array of uploaded file info or nulls for failures.
 */
const uploadMultipleFilesToCloudinary = async (filePaths, options = {}) => {
    try {
        if (!Array.isArray(filePaths) || filePaths.length === 0) return null;

        const uploadPromises = filePaths.map(async (filePath) => {
            try {
                const uploadedFile = await cloudinary.uploader.upload(
                    filePath,
                    {
                        resource_type: "auto",
                        folder: "general",
                        ...options,
                    }
                );
                deleteLocalFile(filePath);
                return uploadedFile;
            } catch (error) {
                console.error(`Error uploading ${filePath}: ${error.message}`);
                deleteLocalFile(filePath);
                return null;
            }
        });

        return await Promise.all(uploadPromises);
    } catch (error) {
        console.log(filePaths);
        deleteLocalFile(filePaths);
        console.error(`Cloudinary Bulk Upload Error ==> ${error.message}`);
        return null;
    }
};

/**
 * Deletes multiple files from Cloudinary with a default resource type.
 * @param {Array<string>} fileUrls - List of file URLs to delete from Cloudinary.
 * @param {string} resourceType - Resource type of the files (default is "image").
 * @returns {Array<object|null>} - Array of deletion results or nulls for failures.
 */
const deleteMultipleFilesFromCloudinary = async (
    fileUrls,
    resourceType = "image"
) => {
    try {
        if (!Array.isArray(fileUrls) || fileUrls.length === 0) return null;

        const deletePromises = fileUrls.map(async (fileUrl) => {
            const publicId = extractPublicId(fileUrl);
            try {
                const deletedFile = await cloudinary.uploader.destroy(
                    publicId,
                    {
                        resource_type: resourceType,
                    }
                );
                console.log(
                    deletedFile.result === "ok"
                        ? `File ${publicId} deleted successfully.`
                        : `Failed to delete file ${publicId}.`
                );
                return deletedFile;
            } catch (error) {
                console.error(`Error deleting ${publicId}: ${error.message}`);
                return null;
            }
        });

        return await Promise.all(deletePromises);
    } catch (error) {
        console.error(`Cloudinary Bulk Deletion Error ==> ${error.message}`);
        return null;
    }
};

module.exports = {
    uploadFileToCloudinary,
    uploadMultipleFilesToCloudinary,
    deleteFileFromCloudinary,
    deleteMultipleFilesFromCloudinary,
};

