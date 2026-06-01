import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from '../config/app-config.module';
import { DemoAuthController } from './demo-auth.controller';
import { DemoAuthService } from './demo-auth.service';

@Module({
  imports: [
    AppConfigModule,
    JwtModule.register({}),
  ],
  controllers: [DemoAuthController],
  providers: [DemoAuthService],
  exports: [DemoAuthService],
})
export class DemoAuthModule {}
