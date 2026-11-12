import { Module } from "@nestjs/common";
import { ApiModule } from "./api.module";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TmpCleanupService } from "./modules/tmp-cleanup/tmp-cleanup.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ApiModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),
  ],
  providers: [TmpCleanupService],
})
export class AppModule {}
