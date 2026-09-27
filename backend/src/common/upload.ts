import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage, type Options } from 'multer';

const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

export function uploadsRoot() {
  return join(process.cwd(), 'uploads');
}

export function ensureUploadDir(subdir: 'profiles' | 'shops') {
  const dir = join(uploadsRoot(), subdir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function createImageUploadOptions(
  subdir: 'profiles' | 'shops',
): Options {
  const destination = ensureUploadDir(subdir);

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, cb) => {
        const rawExt = extname(file.originalname).toLowerCase();
        const ext =
          rawExt === '.jpeg' ||
          rawExt === '.jpg' ||
          rawExt === '.png' ||
          rawExt === '.webp' ||
          rawExt === '.gif'
            ? rawExt
            : '.jpg';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.test(file.mimetype)) {
        cb(
          new BadRequestException(
            'Only JPEG, PNG, WebP, or GIF images are allowed',
          ) as unknown as Error,
        );
        return;
      }
      cb(null, true);
    },
  };
}

/** Relative public path stored in DB, e.g. /uploads/profiles/uuid.jpg */
export function publicUploadPath(
  subdir: 'profiles' | 'shops',
  filename: string,
) {
  return `/uploads/${subdir}/${filename}`;
}

/** Best-effort delete of a previously stored local upload. */
export function tryDeleteUpload(photoUrl: string | null | undefined) {
  if (!photoUrl?.startsWith('/uploads/')) {
    return;
  }

  const absolute = join(process.cwd(), photoUrl.replace(/^\//, ''));
  try {
    if (existsSync(absolute)) {
      unlinkSync(absolute);
    }
  } catch {
    // Ignore cleanup failures — upload still succeeded.
  }
}
