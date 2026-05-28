import { validateConfigValue } from './config.schema';

describe('validateConfigValue', () => {
    it('converts legacy atomic institution ids to arrays', () => {
        expect(validateConfigValue('ror_id', 'https://ror.org/xxxxx')).toEqual(['https://ror.org/xxxxx']);
        expect(validateConfigValue('openalex_id', 'I123456789')).toEqual(['I123456789']);
    });

    it('accepts institution id arrays', () => {
        expect(validateConfigValue('ror_id', ['https://ror.org/xxxxx', 'https://ror.org/yyyyy'])).toEqual([
            'https://ror.org/xxxxx',
            'https://ror.org/yyyyy'
        ]);
        expect(validateConfigValue('openalex_id', ['I123456789', 'I987654321'])).toEqual([
            'I123456789',
            'I987654321'
        ]);
    });

    it('validates each ror id array item', () => {
        expect(() => validateConfigValue('ror_id', ['not-a-ror-id'])).toThrow();
    });
});
