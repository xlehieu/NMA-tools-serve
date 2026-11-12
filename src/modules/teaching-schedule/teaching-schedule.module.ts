import { Module } from "@nestjs/common";
import { ExcelTeachingScheduleService } from "./excel-teaching-schedule.service";
import { ExcelModule } from "../excel/excel.module";

@Module({
  imports: [ExcelModule],
  providers: [ExcelTeachingScheduleService],
  exports: [ExcelTeachingScheduleService],
})
export class TeachingScheduleModule {}
