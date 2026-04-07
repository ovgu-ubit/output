import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { validateConfigValue } from './config.schema';
import { createValidationHttpException } from '../common/api-error';

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
      throw createValidationHttpException([
        {
          path: 'value',
          code: 'invalid_config_value',
          message: `${value.key}: ${e.message}`,
        },
      ]);
    }
  }
}
