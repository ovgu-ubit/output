import { NestFactory } from "@nestjs/core";
import { InitModule } from "./init.module";

async function init() {
    const app = await NestFactory.create(InitModule);
    await app.close()
    process.exit(0);
}

init();
