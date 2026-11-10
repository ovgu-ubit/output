import { validateConfigValue } from './config.schema';
import { CONFIG_DEFAULTS } from './config.defaults';

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

    it.each([true, false])('preserves tags: %s when validating publication index columns for saving', tags => {
        const columns = { ...CONFIG_DEFAULTS.pub_index_columns, tags };

        expect(validateConfigValue('pub_index_columns', columns)).toEqual(columns);
    });

    it('keeps tags hidden for legacy publication index column configurations', () => {
        const columns: Partial<typeof CONFIG_DEFAULTS.pub_index_columns> = { ...CONFIG_DEFAULTS.pub_index_columns };
        delete columns.tags;

        expect(validateConfigValue('pub_index_columns', columns)).toEqual({ ...columns, tags: false });
    });

    it('rejects non-boolean publication tags column settings', () => {
        expect(() => validateConfigValue('pub_index_columns', {
            ...CONFIG_DEFAULTS.pub_index_columns,
            tags: 'true',
        })).toThrow();
    });
});
