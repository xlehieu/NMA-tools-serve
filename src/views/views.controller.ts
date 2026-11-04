import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { ConvertService } from '../convert/convert.service';
import { PdfService } from '../convert/pdf.service';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const OUTPUT_ROOT = path.join(process.cwd(), 'output');

@Controller()
export class ViewsController {
  constructor(
    private readonly convertService: ConvertService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  index(@Res() res: Response) {
    return res.render('pages/convert.njk', { title: 'Convert DOCX sang PDF' });
  }

  @Get('pdf/convert')
  convertPage(@Res() res: Response) {
    return res.render('pages/convert.njk', { title: 'Convert DOCX sang PDF' });
  }

  @Get('pdf/copy-protected')
  copyProtectedPage(@Res() res: Response) {
    return res.render('pages/copy-protected.njk', { title: 'Copy protected PDF' });
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const sessionId = Date.now().toString();
          (req as any)._sessionId = (req as any)._sessionId || sessionId;
          const dir = path.join(UPLOAD_ROOT, (req as any)._sessionId);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          // giữ nguyên tên gốc (đã decode utf8) để file pdf xuất ra có tên tương ứng
          const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
          cb(null, original);
        },
      }),
      fileFilter: (req, file, cb) => {
        const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
        if (path.extname(original).toLowerCase() !== '.docx') {
          return cb(new BadRequestException(`File "${original}" không phải .docx`), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('outputDir') customOutputDir: string,
    @Res() res: Response,
  ) {
    if (!files || files.length === 0) {
      return res.render('pages/convert.njk', {
        title: 'Convert DOCX sang PDF',
        errorMessage: 'Bạn chưa chọn file .docx nào.',
      });
    }

    const sessionId = path.basename(path.dirname(files[0].path));

    // Nếu người dùng nhập đường dẫn cụ thể (vd: E:\THPT NQ) thì lưu thẳng vào đó,
    // không thì lưu tạm vào ./output/<sessionId>
    const hasCustomPath = !!(customOutputDir && customOutputDir.trim());
    const targetDir = hasCustomPath
      ? path.resolve(customOutputDir.trim())
      : path.join(OUTPUT_ROOT, sessionId);

    let results;
    try {
      results = await this.convertService.convertMany(
        files.map((f) => f.path),
        targetDir,
      );
    } catch (err: any) {
      return res.render('pages/convert.njk', {
        title: 'Convert DOCX sang PDF',
        errorMessage: `Không thể lưu vào đường dẫn "${customOutputDir}": ${err.message}`,
      });
    }

    const viewResults = results.map((r) => ({
      name: path.basename(r.input),
      success: r.success,
      error: r.error,
      downloadUrl: r.success
        ? hasCustomPath
          ? `/download-file?path=${encodeURIComponent(r.output!)}`
          : `/download/${sessionId}/${encodeURIComponent(path.basename(r.output!))}`
        : null,
    }));

    const successCount = viewResults.filter((item) => item.success).length;
    return res.render('pages/result.njk', {
      title: 'Kết quả convert',
      items: viewResults,
      successCount,
      savedPath: hasCustomPath ? targetDir : null,
    });
  }

  @Post('copy-pdf')
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const sessionId = Date.now().toString();
          (req as any)._sessionId = sessionId;
          const dir = path.join(UPLOAD_ROOT, sessionId);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
          cb(null, original);
        },
      }),
      fileFilter: (req, file, cb) => {
        const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
        if (path.extname(original).toLowerCase() !== '.pdf') {
          return cb(new BadRequestException(`File "${original}" không phải .pdf`), false);
        }
        cb(null, true);
      },
    }),
  )
  async copyPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
    @Body('outputDir') customOutputDir: string,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.render('pages/copy-protected.njk', {
        title: 'Copy protected PDF',
        errorMessage: 'Bạn chưa chọn file PDF.',
      });
    }

    try {
      const result = await this.pdfService.copyProtectedPdf(file.path, password, customOutputDir);
      const downloadUrl = `/download-file?path=${encodeURIComponent(result.output)}`;
      return res
        .render('pages/result.njk', {
          title: 'Kết quả sao chép PDF',
          items: [
            { name: path.basename(file.path), success: true, downloadUrl },
          ],
          successCount: 1,
          savedPath: result.output,
        });
    } catch (err: any) {
      return res.render('pages/copy-protected.njk', {
        title: 'Copy protected PDF',
        errorMessage: `Không thể sao chép PDF: ${err.message}`,
      });
    }
  }

  @Get('download/:sessionId/:filename')
  download(@Param('sessionId') sessionId: string, @Param('filename') filename: string, @Res() res: Response) {
    // chặn path traversal
    if (sessionId.includes('..') || filename.includes('..')) {
      throw new BadRequestException('Đường dẫn không hợp lệ');
    }
    const filePath = path.join(OUTPUT_ROOT, sessionId, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Không tìm thấy file');
    }
    res.download(filePath, filename);
  }

  @Get('download-file')
  downloadCustom(@Query('path') filePath: string, @Res() res: Response) {
    if (!filePath || path.extname(filePath).toLowerCase() !== '.pdf') {
      throw new BadRequestException('Đường dẫn file không hợp lệ');
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Không tìm thấy file');
    }
    res.download(filePath, path.basename(filePath));
  }
}