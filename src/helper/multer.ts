import { diskStorage } from 'multer';
import { extname } from 'path';
import fs from 'fs';

export const multerStorage = (folder: 'user' | 'product') =>
  diskStorage({
    destination: (req, file, cb) => {
      const path = `./uploads/${folder}`;

      // Ensure folder exists
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }

      cb(null, path);
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });
