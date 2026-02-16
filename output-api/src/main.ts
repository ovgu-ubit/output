import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { AppModule } from './app.module';

async function bootstrap() {
    const server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    // Read parameters from environment file:
    let port: number = Number(process.env.PORT) || app.get(ConfigService).get<number>('APP_PORT');
    let ssl: boolean = ['true', '1'].includes(app.get(ConfigService).get<string>('APP_SSL')?.toLowerCase());
    const cert_key: string = app.get(ConfigService).get<string>('APP_SSL_KEY').toLowerCase();
    const cert_pub: string = app.get(ConfigService).get<string>('APP_SSL_PUB').toLowerCase();
    const cert_chain: string = app.get(ConfigService).get<string>('APP_SSL_CHAIN').toLowerCase();
    const cert_passphrase: string = app.get(ConfigService).get<string>('APP_SSL_PASSPHRASE');
    let cors_origins: string[] = app.get(ConfigService).get<string>('APP_CORS_ORIGINS').split(',');
    let base_path: string = app.get(ConfigService).get<string>('APP_BASE_PATH');
    const docker_mode: boolean = app.get(ConfigService).get<boolean>('APP_DOCKER_MODE');

    const swagger_path = "swagger";

    if (docker_mode) {
        port = 3000;
        cors_origins = ["http://localhost:1080"];
        ssl = false;
        base_path = ""
    }

    const processedCORS = [];
    for (const cors_or of cors_origins) {
        let obj;
        if (cors_or.endsWith('/')) obj = cors_or.substring(0, cors_or.length - 1)
        else obj = cors_or;
        processedCORS.push(obj)
    }

    const config = new DocumentBuilder()
        .setTitle('Output API')
        .setDescription('The Output API description')
        .setVersion('2.0.1')
        .addServer(base_path)
        .build();
    const options: SwaggerDocumentOptions = {
        operationIdFactory: (
            controllerKey: string,
            methodKey: string
        ) => methodKey
    };
    const document = SwaggerModule.createDocument(app, config, options);
    SwaggerModule.setup(swagger_path, app, document);

    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.enableCors({
        origin: processedCORS,
        methods: 'GET, PUT, POST, DELETE',
        allowedHeaders: 'Content-Type, Authorization',
        credentials: true
    });
    app.use(bodyParser.json({ limit: '1mb' })); // parse requests of content-type "application/json"
    app.use(bodyParser.urlencoded({ extended: true })); // parse requests of content-type "application/x-www-form-urlencoded"
    app.use(cookieParser());
    await app.init();

    if (ssl) {
        const certOptions = {
            key: fs.readFileSync(cert_key),
            cert: fs.readFileSync(cert_pub),
            ca: fs.readFileSync(cert_chain),
            passphrase: cert_passphrase
        };
        https.createServer(certOptions, server).listen(port, () => {
            console.log(`SSL server is running on port ${port}.`);
        }).on('error', (err) => {
            console.log(`Failed to start SSL server on port ${port}!\n${err}`);
            process.exit(1);
        });
    } else {
        http.createServer(server).listen(port, () => {
            console.log(`Server is running on port ${port}.`);
        }).on('error', (err) => {
            console.log(`Failed to start server on port ${port}!\n${err}`);
            process.exit(1);
        });
    }
}

bootstrap();

