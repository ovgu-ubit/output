import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { DemoAuthService } from './demo-auth.service';
import { DemoLoginDto } from './demo-login.dto';

@Controller('auth')
export class DemoAuthController {
  constructor(private readonly demoAuthService: DemoAuthService) {}

  @Post('login')
  async login(
    @Body() credentials: DemoLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginResult = await this.demoAuthService.login(credentials.username, credentials.password);
    await this.setAuthCookies(response, loginResult.token, loginResult.details);
    return loginResult.details;
  }

  @Get('publickey')
  async publicKey() {
    await this.demoAuthService.assertDemoMode();
    return this.demoAuthService.getPublicKey();
  }

  @Post('logout')
  async logoutPost(@Res({ passthrough: true }) response: Response) {
    await this.clearAuthCookies(response);
    return { success: true };
  }

  @Get('logout')
  async logoutGet(@Res({ passthrough: true }) response: Response) {
    await this.clearAuthCookies(response);
    return { success: true };
  }

  private async setAuthCookies(response: Response, token: string, details: unknown) {
    const secure = await this.demoAuthService.isSecureCookie();
    const maxAge = this.demoAuthService.getTokenMaxAgeMs();

    response.cookie('auth-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge,
    });
    response.cookie('auth-details', JSON.stringify(details), {
      httpOnly: false,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge,
    });
  }

  private async clearAuthCookies(response: Response) {
    await this.demoAuthService.assertDemoMode();
    const secure = await this.demoAuthService.isSecureCookie();
    const baseOptions = {
      sameSite: 'lax' as const,
      secure,
      path: '/',
    };

    response.clearCookie('auth-token', {
      ...baseOptions,
      httpOnly: true,
    });
    response.clearCookie('auth-details', {
      ...baseOptions,
      httpOnly: false,
    });
  }
}
