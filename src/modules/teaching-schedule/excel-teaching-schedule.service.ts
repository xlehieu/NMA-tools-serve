import { BadRequestException, Injectable } from "@nestjs/common";
import * as XLSX from "xlsx";
import { ExcelReaderService } from "../excel/excel-reader.service";

const headers = ["Môn học", "Lớp học", "Tiết theo PPCT"];

function cellText(value: unknown) {
  return String(value ?? "").trim().normalize("NFC");
}

@Injectable()
export class ExcelTeachingScheduleService {
  constructor(private readonly excelReaderService: ExcelReaderService) {}

  getSubjectChoices(currentFile: Buffer) {
    const current = this.readSchedule(currentFile, "tuần mới");
    const subjectsSheet = current.workbook.Sheets["MonHoc"];
    if (!subjectsSheet) {
      throw new BadRequestException("File tuần mới không có sheet MonHoc.");
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(subjectsSheet, { header: 1, blankrows: false });
    const headerRow = rows.find((row) => row.some((value) => cellText(value) === "Tên môn học"));
    if (!headerRow) {
      throw new BadRequestException("Không tìm thấy cột Tên môn học trong sheet MonHoc.");
    }
    const column = headerRow.findIndex((value) => cellText(value) === "Tên môn học");
    const choices = [...new Set(rows.slice(rows.indexOf(headerRow) + 1).map((row) => cellText(row[column])).filter(Boolean))];
    return {
      subjects: [...new Set(current.lessons.map((lesson) => lesson.subject))],
      choices,
    };
  }

  updatePeriods(previousFile: Buffer, currentFile: Buffer, format: "xls" | "xlsx", subjectMappings: Record<string, string> = {}) {
    const previous = this.readSchedule(previousFile, "tuần cũ");
    const current = this.readSchedule(currentFile, "tuần mới");
    const lastPeriods = new Map<string, number>();

    for (const lesson of previous.lessons) {
      const period = this.readPeriod(previous.sheet, lesson.address, "tuần cũ");
      if (period !== undefined) {
        lastPeriods.set(lesson.key, Math.max(lastPeriods.get(lesson.key) ?? 0, period));
      }
    }

    if (!current.lessons.length) {
      throw new BadRequestException("File tuần mới chưa có dòng nào đủ môn học và lớp học.");
    }

    for (const lesson of current.lessons) {
      const lastPeriod = lastPeriods.get(lesson.key);
      if (lastPeriod === undefined) {
        throw new BadRequestException(`Không tìm thấy tiết PPCT hợp lệ ở tuần cũ cho ${lesson.subject} – ${lesson.className}.`);
      }
      const period = lastPeriod + 1;
      const newSubject = subjectMappings[lesson.subject];
      if (newSubject) {
        current.sheet[lesson.subjectAddress] = { ...current.sheet[lesson.subjectAddress], v: newSubject };
        delete current.sheet[lesson.subjectAddress].w;
      }
      const cell = { ...current.sheet[lesson.address], t: "n", v: period } satisfies XLSX.CellObject;
      delete cell.w;
      delete cell.f;
      delete cell.h;
      delete cell.r;
      current.sheet[lesson.address] = cell;
      lastPeriods.set(lesson.key, period);
    }

    return XLSX.write(current.workbook, { type: "buffer", bookType: format, cellStyles: true }) as Buffer;
  }

  private readPeriod(sheet: XLSX.WorkSheet, address: string, label: string) {
    const value: unknown = sheet[address]?.v;
    if (value === undefined || value === null || value === "") return undefined;

    const period = typeof value === "string" && /^\d+$/.test(value.trim())
      ? Number(value)
      : value;
    if (typeof period !== "number" || !Number.isSafeInteger(period) || period < 1) {
      throw new BadRequestException(
        `Ô ${address} trong file ${label} phải chứa một số nguyên dương.`,
      );
    }
    return period;
  }

  private readSchedule(buffer: Buffer, label: string) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = this.excelReaderService.readWorkbook(buffer);
    } catch {
      throw new BadRequestException(`Không đọc được file Excel ${label}.`);
    }

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet["!ref"]) continue;
      const range = XLSX.utils.decode_range(sheet["!ref"]);
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true });
      const headerIndex = rows.findIndex((row) =>
        headers.every((header) => row.some((value) => cellText(value) === header)),
      );
      if (headerIndex === -1) continue;

      const [subjectColumn, classColumn, periodColumn] = headers.map((header) =>
        rows[headerIndex].findIndex((value) => cellText(value) === header),
      );
      const lessons = [];
      for (let index = headerIndex + 1; index < rows.length; index++) {
        const subject = cellText(rows[index][subjectColumn]);
        const className = cellText(rows[index][classColumn]);
        if (!subject || !className) continue;
        lessons.push({
          subject,
          className,
          key: JSON.stringify([subject.toUpperCase(), className.toUpperCase()]),
          subjectAddress: XLSX.utils.encode_cell({ r: range.s.r + index, c: range.s.c + subjectColumn }),
          address: XLSX.utils.encode_cell({ r: range.s.r + index, c: range.s.c + periodColumn }),
        });
      }
      return { workbook, sheet, lessons };
    }

    throw new BadRequestException(`Không tìm thấy bảng lịch báo giảng trong file ${label}.`);
  }
}
