import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
} from "@nestjs/common";
import type { Response, Request } from "express";
import * as fs from "fs";
import * as path from "path";
import { TMP_OUTPUT_ROOT } from "../const/dir";
import {
  UploadMultipleFiles,
  UploadSingleFile,
} from "../decorators/file-interceptor.decorator";
import { ConvertService } from "../modules/pdf/convert.service";
import { PdfService } from "../modules/pdf/pdf.service";
@Controller()
export class ViewsController {
  private readonly logger = new Logger(ViewsController.name);
  constructor(
    private readonly convertService: ConvertService,
    private readonly pdfService: PdfService,
  ) {}

  //region convert-doc-to-pdf
  @Post("convert-doc-to-pdf")
  @UploadMultipleFiles("files", [".docx"], 50)
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("outputDir") customOutputDir: string,
    @Res() res: Response,
  ) {
    if (!files || files.length === 0) {
      return res.render("pages/pdf/convert.njk", {
        title: "Convert DOCX sang PDF",
        errorMessage: "Bạn chưa chọn file .docx nào.",
      });
    }

    const sessionId = path.basename(path.dirname(files[0].path));

    // Nếu người dùng nhập đường dẫn cụ thể (vd: E:\THPT NQ) thì lưu thẳng vào đó,
    // không thì lưu tạm vào ./output/<sessionId>
    const hasCustomPath = !!(customOutputDir && customOutputDir.trim());
    const targetDir = hasCustomPath
      ? path.resolve(customOutputDir.trim())
      : path.join(TMP_OUTPUT_ROOT, sessionId);

    let results;
    try {
      results = await this.convertService.convertMany(
        files.map((f) => f.path),
        targetDir,
      );
    } catch (err: any) {
      return res.render("pages/pdf/convert.njk", {
        title: "Convert DOCX sang PDF",
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
    return res.render("pages/result.njk", {
      title: "Kết quả convert",
      items: viewResults,
      successCount,
      savedPath: hasCustomPath ? targetDir : null,
    });
  }

  //region copy-protected-pdf
  @Post("copy-protected-pdf")
  @UploadSingleFile("pdf", [".pdf"])
  async copyPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body("password") password: string,
    @Body("outputDir") customOutputDir: string,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.render("pages/pdf/copy-protected.njk", {
        title: "Copy protected PDF",
        errorMessage: "Bạn chưa chọn file PDF.",
      });
    }

    try {
      const result = await this.pdfService.copyProtectedPdf(
        file.path,
        password,
        customOutputDir,
      );
      const downloadUrl = `/download-file?path=${encodeURIComponent(result.output)}`;
      return res.render("pages/result.njk", {
        title: "Kết quả sao chép PDF",
        items: [{ name: path.basename(file.path), success: true, downloadUrl }],
        successCount: 1,
        savedPath: result.output,
      });
    } catch (err: any) {
      return res.render("pages/pdf/copy-protected.njk", {
        title: "Copy protected PDF",
        errorMessage: `Không thể sao chép PDF: ${err.message}`,
      });
    }
  }

  @Get("download/:sessionId/:filename")
  download(
    @Param("sessionId") sessionId: string,
    @Param("filename") filename: string,
    @Res() res: Response,
  ) {
    // chặn path traversal
    if (sessionId.includes("..") || filename.includes("..")) {
      throw new BadRequestException("Đường dẫn không hợp lệ");
    }
    const filePath = path.join(TMP_OUTPUT_ROOT, sessionId, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException("Không tìm thấy file");
    }
    res.download(filePath, filename);
  }

  @Get("download-file")
  downloadCustom(@Query("path") filePath: string, @Res() res: Response) {
    if (!filePath || path.extname(filePath).toLowerCase() !== ".pdf") {
      throw new BadRequestException("Đường dẫn file không hợp lệ");
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException("Không tìm thấy file");
    }
    res.download(filePath, path.basename(filePath));
  }

  @Get("{*path}")
  renderPage(@Req() req: Request, @Res() res: Response) {
    const routeName = req.path.replace(/^\/+|\/+$/g, "") || "pdf/convert";
    const templatePath = `pages/${routeName}.njk`;
    res.render(templatePath, {}, (err, html) => {
      if (err) {
        this.logger.error(err);
        return res.status(404).render("pages/not-found.njk");
      }

      return res.send(html);
    });
  }
}
