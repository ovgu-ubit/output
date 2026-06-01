import { IsString } from 'class-validator';

export class DemoLoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
