import { Module } from "@nestjs/common";
import { ViewsModule } from "./views/views.module";
import { ConfigModule } from "@nestjs/config";
import { ConvertModule } from "./modules/pdf/convert.module";
import { ScheduleModule } from "@nestjs/schedule";
import { TmpCleanupService } from "./modules/tmp-cleanup/tmp-cleanup.service";

@Module({
  imports: [
    ConvertModule,
    ScheduleModule.forRoot(),
    ViewsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [TmpCleanupService],
})
export class AppModule {}
