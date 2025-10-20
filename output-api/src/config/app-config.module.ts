import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './ConfigEntity';
import { ConfigController } from './ConfigController';
import { AppConfigService } from './app-config.service';
import { ConfigModule } from '@nestjs/config';
import appConfig from '../../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Config]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
      load: [appConfig]
    })],
  controllers: [ConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule { }
