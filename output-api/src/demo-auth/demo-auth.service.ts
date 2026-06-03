import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync } from 'crypto';
import { AppConfigService } from '../config/app-config.service';

export interface DemoAuthDetails {
  id: string;
  permissions: { appname: string; rolename: string }[];
}

@Injectable()
export class DemoAuthService {
  private readonly tokenMaxAgeMs = 8 * 60 * 60 * 1000;
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(
    private readonly configService: AppConfigService,
    private readonly jwtService: JwtService,
  ) {
    const keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;
  }

  async isDemoMode(): Promise<boolean> {
    return this.isTruthy(await this.configService.get('DEMO_MODE'));
  }

  async assertDemoMode(): Promise<void> {
    if (await this.isDemoMode()) return;
    throw new NotFoundException('Demo authentication is not available.');
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getTokenMaxAgeMs(): number {
    return this.tokenMaxAgeMs;
  }

  async isSecureCookie(): Promise<boolean> {
    return this.isTruthy(await this.configService.get('APP_SSL'));
  }

  async login(username: string, password: string): Promise<{ token: string; details: DemoAuthDetails }> {
    await this.assertDemoMode();

    const demoUser = await this.configService.get('DEMO_USER');
    const demoPassword = await this.configService.get('DEMO_PW');

    if (username !== demoUser || password !== demoPassword) {
      throw new UnauthorizedException('Invalid demo credentials.');
    }

    const details: DemoAuthDetails = {
      id: demoUser,
      permissions: [{ appname: 'output', rolename: 'admin' }],
    };
    const token = await this.jwtService.signAsync(details, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn: '8h',
    });

    return { token, details };
  }

  private isTruthy(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;
    return ['true', '1'].includes(value.trim().toLowerCase());
  }
}
