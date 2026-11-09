import { Injectable } from "@nestjs/common";
import { ExcelReaderService } from "../excel/excel-reader.service";

@Injectable()
export class ExcelTeachingScheduleService {
  constructor(private readonly excelReaderService: ExcelReaderService) {}
}
