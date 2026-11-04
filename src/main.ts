import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as nunjucks from "nunjucks";
import { join } from "path";
import { buildMenu } from "./views/menu";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  const viewsDir = join(__dirname, "views");
  nunjucks.configure(viewsDir, {
    autoescape: true,
    express: app.getHttpAdapter().getInstance(),
    watch: process.env.NODE_ENV !== "production",
  });
  app.setBaseViewsDir(viewsDir);
  app.setViewEngine("njk");
  app.useStaticAssets(join(process.cwd(), "public", "static"), { prefix: "/static" });
  app.use((req, res, next) => {
    res.locals.menu = buildMenu(req.path);
    next();
  });
  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Mở trình duyệt: http://localhost:${port}`);
}
bootstrap();
