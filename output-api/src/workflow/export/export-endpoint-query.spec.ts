import { DataSource, EntitySchema, Repository } from 'typeorm';
import { ExportStrategy } from '@output/interfaces';
import { ExportWorkflow } from '../ExportWorkflow.entity';
import { WorkflowService } from '../workflow.service';
import { ExportEndpointService } from './export-endpoint.service';

class QueryDataSource extends DataSource {
    async prepareMetadata(): Promise<void> { await this.buildMetadatas(); }
}

describe('Endpoint export PostgreSQL queries', () => {
    let repository: Repository<ExportWorkflow>;
    let findOne: jest.SpyInstance;

    beforeAll(async () => {
        // Exercise TypeORM's real SQL generation without opening a database connection.
        const source = new QueryDataSource({ type: 'postgres', entities: [new EntitySchema<ExportWorkflow>({
            name: 'ExportWorkflow', target: ExportWorkflow, tableName: 'workflow_export',
            columns: {
                id: { type: Number, primary: true },
                workflow_id: { type: String },
                source_entity: { type: String },
                strategy_type: { type: 'enum', enum: ExportStrategy },
                strategy: { type: 'jsonb', nullable: true },
                published_at: { type: 'timestamptz', nullable: true },
                deleted_at: { type: 'timestamptz', nullable: true, deleteDate: true },
            },
        })] });
        await source.prepareMetadata();
        repository = source.getRepository(ExportWorkflow);
    });

    beforeEach(() => {
        findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    });

    afterEach(() => { jest.restoreAllMocks(); });

    const expectQuotedStrategy = (name: string) => {
        const [query, parameters] = repository.createQueryBuilder()
            .setFindOptions(findOne.mock.calls[0][0]).getQueryAndParameters();
        expect(query).toContain('FROM "workflow_export" "ExportWorkflow"');
        expect(query).toContain('"ExportWorkflow"."strategy" ->> \'endpoint_name\' = $');
        expect(parameters).toContain(name);
    };

    it('quotes the mixed-case table alias when checking endpoint names on publication', async () => {
        const draft: ExportWorkflow = {
            id: 28, workflow_id: 'publications', label: 'Publications', version: 1,
            mapping: '{"title": title}', source_entity: 'publication',
            strategy_type: ExportStrategy.ENDPOINT,
            strategy: { format: 'json', endpoint_name: 'publications', access: 'public' },
        };
        jest.spyOn(repository, 'findOneBy').mockResolvedValueOnce(draft).mockResolvedValueOnce(null);
        jest.spyOn(repository, 'save').mockImplementation(async workflow => workflow as ExportWorkflow);
        const workflows = new WorkflowService({} as never, repository, {} as never, {} as never,
            {} as never, {} as never, {} as never, [], {} as never);

        await expect(workflows.saveExport({ id: 28, published_at: new Date() })).resolves.toMatchObject({
            published_at: expect.any(Date),
        });
        expectQuotedStrategy('publications');
    });

    it('quotes the same alias on endpoint lookup and binds the name as a parameter', async () => {
        const endpoints = new ExportEndpointService(repository, {} as never, {} as never);
        const name = "publications' OR true --";
        await expect(endpoints.resolve(name)).rejects.toMatchObject({ response: { statusCode: 404 } });
        expectQuotedStrategy(name);
        const [query] = repository.createQueryBuilder().setFindOptions(findOne.mock.calls[0][0]).getQueryAndParameters();
        expect(query).not.toContain(name);
    });
});
