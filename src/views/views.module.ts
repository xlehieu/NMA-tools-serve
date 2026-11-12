import { Module } from "@nestjs/common";
import { ViewsController } from "./views.controller";
import { ConvertModule } from "../modules/pdf/convert.module";

import { TeachingScheduleModule } from "../modules/teaching-schedule/teaching-schedule.module";

@Module({
  imports: [ConvertModule, TeachingScheduleModule],
  controllers: [ViewsController],
})
export class ViewsModule {}
