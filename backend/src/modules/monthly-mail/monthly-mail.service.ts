import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { ConvertService } from "../pdf/convert.service";
import { detachMailSource, mergeFields } from "./merge-fields";

const MAX_ROWS = 250;

function fieldKey(name: string) {
  return name.normalize("NFC").trim().replace(/[\s_]+/gu, "_").toLocaleLowerCase("vi");
}

function safeName(name: string, fallback: string) {
  const cleaned = name.normalize("NFC").replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu, "_")
    .trim().slice(0, 100).replace(/[. ]+$/u, "");
  if (!cleaned) return fallback;
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(cleaned) ? `_${cleaned}` : cleaned;
}

function readSheet(data: Buffer) {
  let rows: string[][];
  try {
    const workbook = XLSX.read(data, { type: "buffer", sheets: 0, sheetRows: MAX_ROWS + 2 });
    rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1, raw: false, defval: "", blankrows: true, range: 0,
    });
  } catch {
    throw new BadRequestException("Không đọc được tệp Excel.");
  }
  if (rows.length > MAX_ROWS + 1) {
    throw new BadRequestException(`Trang tính đầu tiên hỗ trợ tối đa ${MAX_ROWS} dòng dữ liệu.`);
  }
  const columns = (rows[0] ?? []).map((name) => name.trim());
  const indices = new Map<string, number>();
  columns.forEach((name, index) => {
    if (!name) return;
    const key = fieldKey(name);
    if (indices.has(key)) throw new BadRequestException(`Tên cột Excel bị trùng: ${name}.`);
    indices.set(key, index);
  });
  if (!indices.size) throw new BadRequestException("Dòng đầu tiên của Excel phải chứa tên cột.");
  const records = rows.slice(1).map((cells, index) => ({ cells, row: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim()));
  if (!records.length) throw new BadRequestException("Excel chưa có dòng dữ liệu.");
  return { columns: columns.filter(Boolean), indices, records };
}

@Injectable()
export class MonthlyMailService {
  private readonly logger = new Logger(MonthlyMailService.name);

  constructor(private readonly converter: ConvertService) {}

  inspect(excel: Buffer) {
    const { columns, records } = readSheet(excel);
    return { columns, count: records.length };
  }

  async generate(template: Buffer, excel: Buffer, nameField: string, zipName: string) {
    const { indices, records } = readSheet(excel);
    const nameColumn = indices.get(fieldKey(nameField));
    if (nameColumn === undefined) throw new BadRequestException("Chọn cột Excel để đặt tên PDF.");

    const { docx, parts, fields } = await this.readTemplate(template);
    for (const name of fields) {
      if (!indices.has(fieldKey(name))) {
        throw new BadRequestException(`Excel thiếu cột tương ứng với trường Word “${name}”.`);
      }
    }

    const dir = await mkdtemp(path.join(tmpdir(), "monthly-mail-"));
    try {
      const docs: string[] = [];
      const names = new Map<string, string>();
      const usedNames = new Set<string>();
      for (const { cells, row } of records) {
        const stem = safeName(cells[nameColumn] ?? "", `Thu-thang-dong-${row}`);
        let name = stem;
        for (let suffix = 2; usedNames.has(name.toLocaleLowerCase("vi")); suffix++) {
          name = `${stem} (${suffix})`;
        }
        usedNames.add(name.toLocaleLowerCase("vi"));
        const input = path.join(dir, `row-${row}.docx`);
        names.set(input, `${name}.pdf`);
        for (const part of parts) {
          docx.file(part.name, mergeFields(part.xml, (field) => cells[indices.get(fieldKey(field))!] ?? ""));
        }
        await writeFile(input, await docx.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
        docs.push(input);
      }

      const results = await this.converter.convertMany(
        docs, path.join(dir, "pdf"), undefined, path.join(dir, "profile"),
      ).catch((error: Error) => {
        this.logger.error(error.message);
        throw new InternalServerErrorException("Không thể chuyển sang PDF. Kiểm tra LibreOffice trên máy chủ.");
      });
      const failed = results.filter((result) => !result.success || !result.output);
      if (failed.length) {
        const rows = failed.map(({ input }) => path.basename(input, ".docx").slice(4));
        throw new InternalServerErrorException(`Không tạo được PDF cho dòng Excel: ${rows.join(", ")}.`);
      }

      const archive = new JSZip();
      for (const { input, output } of results) {
        archive.file(names.get(input)!, await readFile(output!));
      }
      return {
        data: await archive.generateAsync({ type: "nodebuffer" }),
        filename: `${safeName(zipName.trim().replace(/\.zip$/iu, ""), "Thu-thang")}.zip`,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async readTemplate(template: Buffer) {
    try {
      const docx = await JSZip.loadAsync(template);
      if (!docx.file("word/document.xml")) throw new Error("Missing Word document");
      const settings = docx.file("word/settings.xml");
      if (settings) docx.file(settings.name, detachMailSource(await settings.async("string")));
      const parts = await Promise.all(
        docx.file(/^word\/(?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/u)
          .map(async (entry) => ({ name: entry.name, xml: await entry.async("string") })),
      );
      const fields = new Set<string>();
      for (const part of parts) {
        mergeFields(part.xml, (name) => {
          fields.add(name);
          return "";
        });
      }
      if (!fields.size) throw new BadRequestException("Mẫu Word cần có ít nhất một trường MERGEFIELD.");
      return { docx, parts, fields };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("Không đọc được mẫu Word .docx.");
    }
  }
}
