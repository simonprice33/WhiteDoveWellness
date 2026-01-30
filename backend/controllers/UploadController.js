/**
 * Upload Controller
 * Handles image uploads for affiliations and other site content
 * Images stored in frontend/public/images/uploads/ - same pattern as PersonalTrainign
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

class UploadController {
  constructor() {
    // Store uploads in frontend/public/images/uploads (same as PersonalTrainign blog images)
    this.uploadPath = path.join(__dirname, '../../frontend/public/images/uploads');
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }

    // Setup multer storage
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        if (!fs.existsSync(this.uploadPath)) {
          fs.mkdirSync(this.uploadPath, { recursive: true });
        }
        cb(null, this.uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `upload-${uniqueSuffix}${ext}`);
      }
    });

    this.upload = multer({
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
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

      // URL matches PersonalTrainign pattern - relative path that nginx serves
      const imageUrl = `/images/uploads/${req.file.filename}`;

      console.log(`✅ Image uploaded: ${req.file.filename}`);
      console.log(`✅ Image URL: ${imageUrl}`);
      console.log(`✅ Stored at: ${path.join(this.uploadPath, req.file.filename)}`);

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
      const imagePath = path.join(this.uploadPath, filename);

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
