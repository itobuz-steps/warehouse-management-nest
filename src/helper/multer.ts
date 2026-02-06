import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { FOLDER_PATH } from 'src/common/constants/file.constant';

export const multerStorage = (folder: string) =>
  diskStorage({
    destination: (req, file, cb) => {
      void (async () => {
        try {
          const uploadPath = join(process.cwd(), FOLDER_PATH.uploads, folder);

          await fs.mkdir(uploadPath, { recursive: true });

          cb(null, uploadPath);
        } catch (error) {
          cb(error as Error, '');
        }
      })();
    },

    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });
