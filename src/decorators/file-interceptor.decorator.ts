import {
  applyDecorators,
  BadRequestException,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";
import { getOriginalFileName } from "../utils/file.util";
import { TMP_UPLOAD_ROOT } from "../const/dir";
import { randomUUID } from "crypto";
// Phần dùng chung: storage + fileFilter.
// extensions có thể là 1 chuỗi (".pdf") hoặc 1 mảng ([".xls", ".xlsx"])
function buildMulterOptions(extensions: string | string[]): MulterOptions {
  // chuẩn hóa: luôn là mảng, chữ thường
  const allowed = ([] as string[])
    .concat(extensions)
    .map((e) => e.toLowerCase());

  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const r = req as any;
        // dùng || để nhiều file trong 1 request vẫn chung 1 thư mục
        r._sessionId = r._sessionId || randomUUID();
        const dir = path.join(TMP_UPLOAD_ROOT, r._sessionId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        // giữ nguyên tên gốc (đã decode utf8)
        cb(null, getOriginalFileName(file));
      },
    }),
    fileFilter: (req, file, cb) => {
      const original = getOriginalFileName(file);
      const ext = path.extname(original).toLowerCase();
      if (!allowed.includes(ext)) {
        return cb(
          new BadRequestException(
            `File "${original}" không hợp lệ, chỉ chấp nhận: ${allowed.join(", ")}`,
          ),
          false,
        );
      }
      cb(null, true);
    },
  };
}

// Decorator upload 1 file  -> dùng với @UploadedFile()
export function UploadSingleFile(field: string, extensions: string | string[]) {
  return applyDecorators(
    UseInterceptors(FileInterceptor(field, buildMulterOptions(extensions))),
  );
}

// Decorator upload nhiều file -> dùng với @UploadedFiles()
export function UploadMultipleFiles(
  field: string,
  extensions: string | string[],
  maxCount = 50,
) {
  return applyDecorators(
    UseInterceptors(
      FilesInterceptor(field, maxCount, buildMulterOptions(extensions)),
    ),
  );
}
