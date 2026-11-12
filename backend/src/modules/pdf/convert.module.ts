import { Module } from "@nestjs/common";
import { ConvertService } from "./convert.service";
import { PdfService } from "./pdf.service";

@Module({
  providers: [ConvertService, PdfService],
  exports: [ConvertService, PdfService],
})
export class ConvertModule {}
