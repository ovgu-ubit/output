import { NestFactory } from "@nestjs/core";
import { InitModule } from "./init.module";
import { InitService } from "./init.service";

async function init() {
    const app = await NestFactory.create(InitModule);
    const initService = app.get(InitService);
    await initService.init(); 
    await app.close()
    process.exit(0);
}

init();
