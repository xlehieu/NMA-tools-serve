import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

@Injectable()
export class ExcelReaderService {
  /**
   * Đọc file Excel (.xls, .xlsx)
   * Nếu truyền sheetName thì chỉ đọc sheet đó.
   * Nếu không truyền thì đọc tất cả các sheet.
   */
  readExcel(filePath: string, sheetName?: string) {
    // 1. Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException("Không tìm thấy file Excel");
    }

    // 2. Kiểm tra định dạng
    const ext = path.extname(filePath).toLowerCase();

    if (![".xls", ".xlsx"].includes(ext)) {
      throw new BadRequestException("Chỉ hỗ trợ file .xls và .xlsx");
    }

    // 3. Đọc workbook
    const workbook = this.readWorkbook(fs.readFileSync(filePath));

    // 4. Đọc một sheet cụ thể
    if (sheetName) {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new NotFoundException(`Không tìm thấy sheet: ${sheetName}`);
      }

      return {
        sheetName,
        data: this.convertSheetToJson(worksheet),
      };
    }

    // 5. Đọc tất cả sheet
    return workbook.SheetNames.map((name) => ({
      sheetName: name,
      data: this.convertSheetToJson(workbook.Sheets[name]),
    }));
  }

  readWorkbook(buffer: Buffer) {
    return XLSX.read(buffer, { type: "buffer", cellDates: true, cellStyles: true });
  }

  /**
   * Chuyển dữ liệu trong worksheet thành JSON
   */
  private convertSheetToJson<T = Record<string, any>>(
    worksheet: XLSX.WorkSheet,
  ): T[] {
    return XLSX.utils.sheet_to_json<T>(worksheet, {
      defval: null,
      raw: false,
    });
  }
}
