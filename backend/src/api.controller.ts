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
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { TMP_OUTPUT_ROOT } from "./const/dir";
import {
  UploadMultipleFiles,
  UploadSingleFile,
} from "./decorators/file-interceptor.decorator";
import { MonthlyMailService } from "./modules/monthly-mail/monthly-mail.service";
import { ConvertService } from "./modules/pdf/convert.service";
import { PdfService } from "./modules/pdf/pdf.service";
import { ExcelTeachingScheduleService } from "./modules/teaching-schedule/excel-teaching-schedule.service";
import { getOriginalFileName } from "./utils/file.util";

@Controller()
export class ApiController {
  constructor(
    private readonly monthlyMailService: MonthlyMailService,
    private readonly convertService: ConvertService,
    private readonly pdfService: PdfService,
    private readonly teachingScheduleService: ExcelTeachingScheduleService,
  ) {}

  @Post("monthly-mail/columns")
  @UseInterceptors(FileFieldsInterceptor([{ name: "excel", maxCount: 1 }], {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  monthlyMailColumns(@UploadedFiles() files: { excel?: Express.Multer.File[] }) {
    const excel = files?.excel?.[0];
    if (!excel || path.extname(excel.originalname).toLowerCase() !== ".xlsx") {
      throw new BadRequestException("Chọn tệp Excel .xlsx.");
    }
    return this.monthlyMailService.inspect(excel.buffer);
  }

  @Post("monthly-mail")
  @UseInterceptors(FileFieldsInterceptor([
    { name: "template", maxCount: 1 },
    { name: "excel", maxCount: 1 },
  ], { limits: { fileSize: 10 * 1024 * 1024, fields: 2 } }))
  async monthlyMail(
    @UploadedFiles() files: { template?: Express.Multer.File[]; excel?: Express.Multer.File[] },
    @Body("nameField") nameField: string,
    @Body("zipName") zipName: string,
    @Res() res: Response,
  ) {
    const template = files?.template?.[0];
    const excel = files?.excel?.[0];
    if (!template || path.extname(template.originalname).toLowerCase() !== ".docx" ||
        !excel || path.extname(excel.originalname).toLowerCase() !== ".xlsx") {
      throw new BadRequestException("Chọn mẫu Word .docx và tệp Excel .xlsx.");
    }
    if (typeof nameField !== "string" || (zipName !== undefined && typeof zipName !== "string")) {
      throw new BadRequestException("Kiểm tra cột đặt tên PDF và tên tệp ZIP.");
    }
    const result = await this.monthlyMailService.generate(template.buffer, excel.buffer, nameField, zipName ?? "");
    return res.set("Access-Control-Expose-Headers", "Content-Disposition")
      .attachment(result.filename).send(result.data);
  }

  @Post("excel/teaching-schedule/subjects")
  @UseInterceptors(FileFieldsInterceptor([{ name: "currentWeek", maxCount: 1 }], {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  getTeachingScheduleSubjects(
    @UploadedFiles() files: { currentWeek?: Express.Multer.File[] },
  ) {
    const file = files?.currentWeek?.[0];
    if (!file) throw new BadRequestException("Chọn file Excel tuần mới.");
    return this.teachingScheduleService.getSubjectChoices(file.buffer);
  }

  @Post("excel/teaching-schedule")
  @UseInterceptors(FileFieldsInterceptor([
    { name: "previousWeek", maxCount: 1 },
    { name: "currentWeek", maxCount: 1 },
  ], { limits: { fileSize: 10 * 1024 * 1024 } }))
  updateTeachingSchedule(
    @UploadedFiles() files: { previousWeek?: Express.Multer.File[]; currentWeek?: Express.Multer.File[] },
    @Res() res: Response,
    @Body("subjectMappings") subjectMappings: string,
  ) {
    const previous = files?.previousWeek?.[0];
    const current = files?.currentWeek?.[0];

    try {
      if (!previous || !current) {
        throw new BadRequestException("Chọn đủ file Excel tuần cũ và tuần mới.");
      }

      const currentName = getOriginalFileName(current);
      const previousExtension = path.extname(getOriginalFileName(previous)).toLowerCase();
      const extension = path.extname(currentName).toLowerCase();
      if (
        ![".xls", ".xlsx"].includes(previousExtension) ||
        (extension !== ".xls" && extension !== ".xlsx")
      ) {
        throw new BadRequestException("Chỉ hỗ trợ file .xls và .xlsx.");
      }

      const output = this.teachingScheduleService.updatePeriods(
        previous.buffer,
        current.buffer,
        extension === ".xls" ? "xls" : "xlsx",
        subjectMappings ? JSON.parse(subjectMappings) : {},
      );
      return res.attachment(`${path.parse(currentName).name} - PPCT${extension}`).send(output);
    } catch (error) {
      throw error;
    }
  }

  //region convert-doc-to-pdf
  @Post("convert-doc-to-pdf")
  @UploadMultipleFiles("files", [".docx"], 50)
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("outputDir") customOutputDir: string,
    @Res() res: Response,
  ) {
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Bạn chưa chọn file .docx nào." });
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
      return res.status(400).json({ message: `Không thể lưu vào đường dẫn "${customOutputDir}": ${err.message}` });
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
    return res.json({ items: viewResults, successCount, savedPath: hasCustomPath ? targetDir : null });
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
      return res.status(400).json({ message: "Bạn chưa chọn file PDF." });
    }

    try {
      const result = await this.pdfService.copyProtectedPdf(
        file.path,
        password,
        customOutputDir,
      );
      const downloadUrl = `/download-file?path=${encodeURIComponent(result.output)}`;
      return res.json({ downloadUrl, savedPath: result.output });
    } catch (err: any) {
      return res.status(400).json({ message: `Không thể sao chép PDF: ${err.message}` });
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


}
