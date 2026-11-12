import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface CopyPdfResult {
  input: string;
  output: string;
  success: boolean;
}

@Injectable()
export class PdfService {
  private readonly pythonBin = process.env.PYTHON_BIN || 'python';
  private readonly copyScript = path.join(process.cwd(), 'scripts', 'copy_pdf.py');
  private readonly defaultOutputDir = path.join(process.cwd(), 'output', 'pdf', 'copy');

  async copyProtectedPdf(
    inputPath: string,
    password: string,
    outputDir?: string,
    timeoutMs = 10 * 60 * 1000,
  ): Promise<CopyPdfResult> {
    if (!inputPath?.trim()) {
      throw new Error('Thiếu đường dẫn file PDF nguồn');
    }
    if (!password) {
      throw new Error('Mật khẩu PDF không được để trống');
    }
    const input = path.resolve(inputPath.trim());
    const destination = outputDir?.trim()
      ? path.resolve(outputDir.trim())
      : this.defaultOutputDir;
    const output = path.join(destination, path.basename(input));

    if (path.extname(input).toLowerCase() !== '.pdf') {
      throw new Error('File nguồn phải có phần mở rộng .pdf');
    }
    if (!fs.existsSync(input)) {
      throw new Error('File PDF nguồn không tồn tại');
    }
    if (input === output) {
      throw new Error('Đường dẫn đích phải khác đường dẫn nguồn');
    }

    fs.mkdirSync(destination, { recursive: true });
    await this.runPythonCopy(input, password, output, timeoutMs);

    if (!fs.existsSync(output)) {
      throw new Error('Không tạo được file PDF đích');
    }

    return { input, output, success: true };
  }

  private runPythonCopy(
    input: string,
    password: string,
    output: string,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        this.pythonBin,
        [this.copyScript, input, output],
        { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true },
      );

      let stderr = '';
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        error ? reject(error) : resolve();
      };

      const timer = setTimeout(() => {
        child.kill();
        finish(new Error(`Quá thời gian chờ (${timeoutMs}ms) khi xử lý PDF`));
      }, timeoutMs);

      child.stderr.on('data', (data) => (stderr += data.toString()));
      child.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          finish(new Error('Không tìm thấy Python. Hãy cài Python hoặc cấu hình biến môi trường PYTHON_BIN.'));
          return;
        }
        finish(new Error(`Không chạy được Python/pypdf: ${error.message}`));
      });
      child.on('close', (code) => {
        if (code === 0) {
          finish();
          return;
        }
        if (fs.existsSync(output)) fs.rmSync(output, { force: true });
        finish(new Error(stderr.trim() || `Python/pypdf kết thúc với mã lỗi ${code}`));
      });

      child.stdin.end(password);
    });
  }
}