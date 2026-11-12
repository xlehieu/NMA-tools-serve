import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import * as fs from "fs";
import * as path from "path";
import { TMP_OUTPUT_ROOT, TMP_UPLOAD_ROOT } from "../../const/dir";

@Injectable()
export class TmpCleanupService {
  private readonly logger = new Logger(TmpCleanupService.name);
  private readonly MAX_AGE_MS = 60 * 60 * 1000; // 1 giờ

  @Cron(CronExpression.EVERY_10_MINUTES)
  cleanup() {
    this.logger.log("Dọn dẹp các thư mục tạm thời...");
    for (const rootCleanup of [TMP_UPLOAD_ROOT, TMP_OUTPUT_ROOT]) {
      this.cleanDir(rootCleanup);
    }
  }

  private cleanDir(root: string) {
    if (!fs.existsSync(root)) return;
    const now = Date.now();

    for (const name of fs.readdirSync(root)) {
      const full = path.join(root, name);
      try {
        const { mtimeMs } = fs.statSync(full);
        if (now - mtimeMs > this.MAX_AGE_MS) {
          fs.rmSync(full, { recursive: true, force: true, maxRetries: 3 });
          this.logger.log(`Đã xoá ${full}`);
        }
      } catch (err: any) {
        // 1 thư mục lỗi không được làm hỏng cả vòng dọn
        this.logger.warn(`Không xoá được ${full}: ${err.message}`);
      }
    }
  }
}
