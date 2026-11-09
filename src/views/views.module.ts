import { Module } from "@nestjs/common";
import { ViewsController } from "./views.controller";
import { ConvertModule } from "../modules/pdf/convert.module";

@Module({
  imports: [ConvertModule],
  controllers: [ViewsController],
})
export class ViewsModule {}
