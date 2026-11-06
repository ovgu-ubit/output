import { QueryRunner } from 'typeorm';
import { ExportEndpoint1793923200000 } from '../../migrations/1793923200000-export_endpoint';
import { CREATE_EXPORT_ENDPOINT_NAME_INDEX } from './export-endpoint-index';

describe('Endpoint export migration', () => {
    it('adds the enum and creates the same unique index as schema initialization', async () => {
        const query = jest.fn().mockResolvedValue([]);
        await new ExportEndpoint1793923200000().up({ query } as unknown as QueryRunner);
        expect(query).toHaveBeenCalledWith(expect.stringContaining("ADD VALUE IF NOT EXISTS '1'"));
        expect(query).toHaveBeenCalledWith(CREATE_EXPORT_ENDPOINT_NAME_INDEX);
        expect(CREATE_EXPORT_ENDPOINT_NAME_INDEX).toContain('"published_at" IS NOT NULL AND "deleted_at" IS NULL');
    });

    it('refuses rollback before any mutations when an endpoint workflow exists, including archived ones', async () => {
        const query = jest.fn().mockResolvedValue([{ exists: true }]);
        await expect(new ExportEndpoint1793923200000().down({ query } as unknown as QueryRunner)).rejects.toThrow('while endpoint workflows exist');
        expect(query).toHaveBeenCalledTimes(1);
        expect(query.mock.calls[0][0]).not.toContain('deleted_at');
    });
});
