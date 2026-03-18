import { BadRequestException } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { JSONataImportService } from './jsonata-import';

describe('JSONataImportService.setVariables', () => {
    let service: JSONataImportService;
    let configService: { get: jest.Mock };
    let http: { get: jest.Mock };

    beforeEach(() => {
        configService = {
            get: jest.fn(async (_key: string) => null),
        };
        http = {
            get: jest.fn(),
        };

        service = new JSONataImportService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            http as any,
        );

        (service as any).reporting_year = '2024';
        (service as any).searchText = 'foo+or+bar';
    });

    it('resolves placeholders and unescapes literal brackets', async () => {
        const result = await service.setVariables('https://example.test?term=[year]\\[dp\\]+and+');

        expect(result).toBe('https://example.test?term=2024[dp]+and+');
    });

    it('preserves escaped bracket expressions after replacing search tags', async () => {
        const result = await service.setVariables('[search_tags]\\[affiliation\\]');

        expect(result).toBe('foo+or+bar[affiliation]');
    });

    it('unescapes literal brackets in safe mode as well', async () => {
        const result = await service.setVariables('https://example.test/[year]\\[dp\\]', undefined, true);

        expect(result).toBe('https://example.test/2024[dp]');
    });

    it('keeps throwing for missing unescaped placeholders', async () => {
        await expect(service.setVariables('https://example.test/[missing]')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('delays the actual lookup request by delayInMs', async () => {
        jest.useFakeTimers();
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).lookupURL = 'https://example.test/search';
        (service as any).max_res_name = 'retmax';
        (service as any).max_res = 1000;
        (service as any).offset_name = 'retstart';
        (service as any).delayInMs = 250;

        const promise = firstValueFrom((service as any).retrieveLookupRequest(100));
        let resolved = false;
        promise.then(() => {
            resolved = true;
        });

        await Promise.resolve();
        expect(http.get).not.toHaveBeenCalled();
        expect(resolved).toBe(false);

        jest.advanceTimersByTime(249);
        await Promise.resolve();
        expect(http.get).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        await Promise.resolve();
        expect(http.get).toHaveBeenCalledWith('https://example.test/search&retmax=1000&retstart=100');

        await expect(promise).resolves.toBe(response);
        expect(resolved).toBe(true);
        jest.useRealTimers();
    });
});
