import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { createValidationException } from './common/validation-exception.factory';
import { DemoResetService } from './demo-reset/demo-reset.service';

export function configureApplication(app: INestApplication, options: { basePath: string; corsOrigins: string[] }): void {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder()
        .setTitle('Output API')
        .setDescription('The Output API description')
        .setVersion('dev')
        .addServer(options.basePath)
        .build(), {
        operationIdFactory: (_controllerKey, methodKey) => methodKey,
    });
    SwaggerModule.setup('swagger', app, document);

    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        exceptionFactory: createValidationException,
    }));
    app.useGlobalFilters(new ApiExceptionFilter());
    app.enableCors({
        origin: options.corsOrigins.map(origin => origin.endsWith('/') ? origin.slice(0, -1) : origin),
        methods: 'GET, PUT, POST, DELETE',
        allowedHeaders: 'Content-Type, Authorization',
        credentials: true,
    });
    app.use(bodyParser.json({ limit: '1mb' }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
}

export async function initializeApplication(app: INestApplication): Promise<void> {
    await app.init();
    await app.get(DemoResetService).resetOnStartup();
}
