import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface ConvertResult {
  input: string;
  output: string | null;
  success: boolean;
  error?: string;
}

@Injectable()
export class ConvertService {
  private readonly logger = new Logger(ConvertService.name);

  // Đường dẫn tới soffice/libreoffice. Có thể override bằng biến môi trường SOFFICE_BIN
  private readonly sofficeBin =
    process.env.SOFFICE_BIN ||
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
  /**
   * Convert một mảng file .docx sang .pdf.
   * @param filePaths mảng đường dẫn tuyệt đối/tương đối tới các file .docx
   * @param outputDir thư mục để lưu file .pdf kết quả
   * @param timeoutMs timeout cho toàn bộ lệnh convert (mặc định 10 phút)
   */
  async convertMany(
    filePaths: string[],
    outputDir: string,
    timeoutMs = 10 * 60 * 1000,
  ): Promise<ConvertResult[]> {
    if (!filePaths || filePaths.length === 0) {
      return [];
    }
    console.log(`sofficeBin: ${this.sofficeBin}`);
    // Lọc file không tồn tại / không phải .docx trước, tránh lệch mảng kết quả
    const preChecked: ConvertResult[] = [];
    const validFiles: string[] = [];

    for (const f of filePaths) {
      const abs = path.resolve(f);
      if (!fs.existsSync(abs)) {
        preChecked.push({
          input: f,
          output: null,
          success: false,
          error: "File không tồn tại",
        });
        continue;
      }
      if (path.extname(abs).toLowerCase() !== ".docx") {
        preChecked.push({
          input: f,
          output: null,
          success: false,
          error: "Không phải file .docx",
        });
        continue;
      }
      validFiles.push(abs);
    }

    if (validFiles.length === 0) {
      return preChecked;
    }

    fs.mkdirSync(outputDir, { recursive: true });

    // Gọi một lần soffice cho toàn bộ batch (nhanh hơn, tránh lock profile khi chạy song song nhiều tiến trình)
    await this.runSofficeConvert(validFiles, outputDir, timeoutMs);

    // Kiểm tra kết quả từng file
    const results: ConvertResult[] = validFiles.map((f) => {
      const base = path.basename(f, ".docx");
      const expectedOutput = path.join(outputDir, `${base}.pdf`);
      const success = fs.existsSync(expectedOutput);
      return {
        input: f,
        output: success ? expectedOutput : null,
        success,
        error: success
          ? undefined
          : "Convert thất bại (không thấy file pdf đầu ra)",
      };
    });

    return [...preChecked, ...results];
  }

  private runSofficeConvert(
    files: string[],
    outputDir: string,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        "--headless",
        "--norestore",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        ...files,
      ];

      this.logger.log(`Chạy: ${this.sofficeBin} ${args.join(" ")}`);

      const child = spawn(this.sofficeBin, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(
          new Error(`Quá thời gian chờ (${timeoutMs}ms) khi chạy soffice`),
        );
      }, timeoutMs);

      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(
          new Error(
            `Không chạy được lệnh "${this.sofficeBin}": ${err.message}. Kiểm tra đã cài LibreOffice chưa.`,
          ),
        );
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        this.logger.debug(stdout);
        if (stderr) this.logger.warn(stderr);
        // soffice có thể trả về code khác 0 dù convert được vài file, nên không reject ở đây,
        // việc xác định thành công/thất bại từng file làm ở bước kiểm tra file output.
        resolve();
      });
    });
  }
}
