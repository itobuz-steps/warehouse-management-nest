import { diskStorage } from 'multer';
import { extname } from 'path';

export const storageConfig = diskStorage({
  destination: './uploads/product', // Make sure this folder exists!
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});
