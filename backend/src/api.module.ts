import { Module } from "@nestjs/common";
import { ApiController } from "./api.controller";
import { ConvertModule } from "./modules/pdf/convert.module";

import { TeachingScheduleModule } from "./modules/teaching-schedule/teaching-schedule.module";

import { MonthlyMailService } from "./modules/monthly-mail/monthly-mail.service";

@Module({
  providers: [MonthlyMailService],
  imports: [ConvertModule, TeachingScheduleModule],
  controllers: [ApiController],
})
export class ApiModule {}
