/**
 * Upload Controller
 * Handles image uploads for affiliations and other site content
 * Save to backend's public folder which is served via Express static
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

class UploadController {
  constructor() {
    // Setup multer for image uploads
    // Save to backend's public folder which is served via Express static
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../public/uploads/images');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `image-${uniqueSuffix}${ext}`);
      }
    });

    this.upload = multer({
      storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/svg+xml';
        if (extname && mimetype) {
          return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
      }
    });
  }

  // POST /api/admin/upload
  uploadImage = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // URL path served via Express static
      const imageUrl = `/uploads/images/${req.file.filename}`;

      console.log(`✅ Image uploaded: ${req.file.filename}`);
      console.log(`✅ URL: ${imageUrl}`);

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        url: imageUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error('❌ Upload image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image'
      });
    }
  };

  // DELETE /api/admin/upload/:filename
  deleteImage = async (req, res) => {
    try {
      const { filename } = req.params;
      const imagePath = path.join(__dirname, '../public/uploads/images', filename);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`✅ Image deleted: ${filename}`);
      }

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete image'
      });
    }
  };
}

module.exports = UploadController;
