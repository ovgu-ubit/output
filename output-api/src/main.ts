import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import express from 'express'
import * as bodyParser from 'body-parser';
import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    // Read parameters from environment file:
    let port: number = Number(process.env.PORT) || app.get(ConfigService).get<number>('APP_PORT');
    let ssl: boolean = ['true', '1'].includes(app.get(ConfigService).get<string>('APP_SSL')?.toLowerCase());
    let cert_key: string = app.get(ConfigService).get<string>('APP_SSL_KEY').toLowerCase();
    let cert_pub: string = app.get(ConfigService).get<string>('APP_SSL_PUB').toLowerCase();
    let cert_chain: string = app.get(ConfigService).get<string>('APP_SSL_CHAIN').toLowerCase();
    let cert_passphrase: string = app.get(ConfigService).get<string>('APP_SSL_PASSPHRASE');
    let cors_origins: string[] = app.get(ConfigService).get<string>('APP_CORS_ORIGINS').split(',');
    let base_path: string = app.get(ConfigService).get<string>('APP_BASE_PATH');
    let docker_mode: boolean = app.get(ConfigService).get<boolean>('APP_DOCKER_MODE');

    let swagger_path = "swagger";

    if (docker_mode) {
        cors_origins = ["localhost"];
        ssl = false;
        base_path = ""
    }

    let processedCORS = [];
    for (let cors_or of cors_origins) {
        let obj;
        if (cors_or.endsWith('/')) obj = cors_or.substring(0, cors_or.length - 1)
        else obj = cors_or;
        processedCORS.push(obj)
    }

    const config = new DocumentBuilder()
        .setTitle('Output API')
        .setDescription('The Output API description')
        .setVersion('dev')
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
            process.exit();
        });
    } else {
        http.createServer(server).listen(port, () => {
            console.log(`Server is running on port ${port}.`);
        }).on('error', (err) => {
            console.log(`Failed to start server on port ${port}!\n${err}`);
            process.exit();
        });
    }
}

bootstrap();

