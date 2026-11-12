import { Module } from "@nestjs/common";
import { ExcelReaderService } from "./excel-reader.service";

@Module({
  providers: [ExcelReaderService],
  exports: [ExcelReaderService],
})
export class ExcelModule {}
