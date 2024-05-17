import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as express from 'express'
import * as bodyParser from 'body-parser';
import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
    const server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    // Read parameters from environment file:
    const port: number = Number(process.env.PORT) || app.get(ConfigService).get<number>('APP_PORT');
    const ssl: boolean = ['true', '1'].includes(app.get(ConfigService).get<string>('APP_SSL')?.toLowerCase());
    const cert_key: string = app.get(ConfigService).get<string>('APP_SSL_KEY').toLowerCase();
    const cert_pub: string = app.get(ConfigService).get<string>('APP_SSL_PUB').toLowerCase();
    const cert_chain: string = app.get(ConfigService).get<string>('APP_SSL_CHAIN').toLowerCase();
    const cert_passphrase: string = app.get(ConfigService).get<string>('APP_SSL_PASSPHRASE');
    const cors_origins: string[] = app.get(ConfigService).get<string>('APP_CORS_ORIGINS').split(',');
    const base_path: string = app.get(ConfigService).get<string>('APP_BASE_PATH');

    const config = new DocumentBuilder()
        .setTitle('Output API')
        .setDescription('The Output API description')
        .setVersion('0.3.0-beta')
        .addServer(base_path)
        .build();
    const options: SwaggerDocumentOptions = {
        operationIdFactory: (
            controllerKey: string,
            methodKey: string
        ) => methodKey
    };
    const document = SwaggerModule.createDocument(app, config, options);
    SwaggerModule.setup('swagger', app, document);

    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.enableCors({
        origin: cors_origins,
        methods: 'GET, PUT, POST, DELETE',
        allowedHeaders: 'Content-Type, Authorization',
        credentials: true
    });
    app.use(bodyParser.json({limit: '1mb'})); // parse requests of content-type "application/json"
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

