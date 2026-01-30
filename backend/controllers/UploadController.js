/**
 * Upload Controller
 * Images stored in backend/uploads/ and served via Express static
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

class UploadController {
  constructor() {
    this.uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }

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

  uploadImage = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
      }

      const filename = req.file.filename;
      const port = process.env.NODE_PORT || 3003;
      const imageUrl = `http://localhost:${port}/api/uploads/${filename}`;

      console.log(`✅ Image uploaded: ${filename}`);
      console.log(`✅ Stored at: ${path.join(this.uploadPath, filename)}`);
      console.log(`✅ URL: ${imageUrl}`);

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        url: imageUrl,
        filename: filename
      });
    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
  };

  deleteImage = async (req, res) => {
    try {
      const { filename } = req.params;
      const imagePath = path.join(this.uploadPath, filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`✅ Image deleted: ${filename}`);
      }
      res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('❌ Delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete image' });
    }
  };
}

module.exports = UploadController;
