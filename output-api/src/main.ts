import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { AppModule } from './app.module';
import { configureApplication, initializeApplication } from './application-bootstrap';

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
    const base_path: string = app.get(ConfigService).get<string>('APP_BASE_PATH');
    const docker_mode: boolean = app.get(ConfigService).get<boolean>('APP_DOCKER_MODE');

    if (docker_mode) {
        port = 3000;
        cors_origins = ["http://localhost:1080"];
        ssl = false;
    }

    configureApplication(app, { basePath: base_path, corsOrigins: cors_origins });
    await initializeApplication(app);

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
