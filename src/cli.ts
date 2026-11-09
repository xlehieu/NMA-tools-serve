import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import * as path from "path";
import * as fs from "fs";
import { AppModule } from "./app.module";
import { ConvertService } from "./modules/pdf/convert.service";

/**
 * Dùng cho tool cá nhân, không cần chạy server HTTP.
 *
 * Cách dùng:
 *   npx ts-node src/cli.ts <thư_mục_chứa_docx> [thư_mục_xuất_pdf]
 *
 * Ví dụ:
 *   npx ts-node src/cli.ts ./input ./output
 *
 * Nếu không truyền thư mục xuất, mặc định là ./output
 */
async function main() {
  const inputDir = process.argv[2];
  const outputDir = process.argv[3] || "./output";

  if (!inputDir) {
    console.error(
      "Cách dùng: ts-node src/cli.ts <thư_mục_chứa_docx> [thư_mục_xuất_pdf]",
    );
    process.exit(1);
  }

  if (!fs.existsSync(inputDir)) {
    console.error(`Không tìm thấy thư mục: ${inputDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith(".docx"))
    .map((f) => path.join(inputDir, f));

  if (files.length === 0) {
    console.log("Không tìm thấy file .docx nào trong thư mục.");
    return;
  }

  console.log(
    `Tìm thấy ${files.length} file .docx. Bắt đầu convert sang PDF...`,
  );

  const appContext = await NestFactory.createApplicationContext(AppModule);
  const convertService = appContext.get(ConvertService);

  const results = await convertService.convertMany(files, outputDir);

  const okList = results.filter((r) => r.success);
  const failList = results.filter((r) => !r.success);

  console.log(
    `\nHoàn tất: ${okList.length}/${results.length} file thành công.`,
  );
  okList.forEach((r) => console.log(`  ✔ ${r.input} -> ${r.output}`));

  if (failList.length > 0) {
    console.log(`\nCác file lỗi:`);
    failList.forEach((r) => console.log(`  ✘ ${r.input}: ${r.error}`));
  }

  await appContext.close();
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
