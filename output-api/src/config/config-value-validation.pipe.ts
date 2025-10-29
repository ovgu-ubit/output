import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { validateConfigValue } from './config.schema';

@Injectable()
export class ConfigValueValidationPipe implements PipeTransform {
  transform(value: any, _meta: ArgumentMetadata) {
    // value ist hier dein DTO (nach class-transformer)
    try {
      const validated = validateConfigValue(value.key, value.value);
      if (validated !== undefined) {
        value.value = validated; // ggf. Defaults aus Zod einsetzen
      }
      return value;
    } catch (e: any) {
      throw new BadRequestException(`Validation failed for ${value.key}: ${e.message}`);
    }
  }
}