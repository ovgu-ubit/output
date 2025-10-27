import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './ConfigEntity';
import { ConfigController } from './ConfigController';
import { AppConfigService } from './app-config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from '../../config';
import { DatabaseConfigService } from './database.config.service';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService
    }),
    TypeOrmModule.forFeature([Config]),
    ConfigModule.forRoot({
      isGlobal: false,
      envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
      load: [appConfig]
    }),
    forwardRef(() => AuthorizationModule)
  ],
  controllers: [ConfigController],
  providers: [AppConfigService, DatabaseConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule { }
