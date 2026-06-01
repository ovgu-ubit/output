import { HttpException, HttpStatus } from '@nestjs/common';
import {  ApiErrorCode, CSVMapping  } from '@output/interfaces';
import { DEMO_UPLOAD_MAX_BYTES } from '../common/demo-upload-policy';
import { ImportController } from './ImportController';

const expectApiError = async (
  promise: Promise<unknown>,
  expected: {
    statusCode: number;
    code: ApiErrorCode;
    message?: string;
  },
) => {
  try {
    await promise;
    fail(`Expected promise to reject with ${expected.code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getResponse()).toMatchObject({
      statusCode: expected.statusCode,
      code: expected.code,
      ...(expected.message ? { message: expected.message } : {}),
    });
  }
};

const uploadFile = (originalname: string, size = 512): Express.Multer.File => ({
  originalname,
  size,
  buffer: Buffer.alloc(0),
} as Express.Multer.File);

describe('ImportController', () => {
  let controller: ImportController;
  let configService: { get: jest.Mock };
  let csvService: {
    setUp: jest.Mock;
    import: jest.Mock;
  };
  let excelService: {
    setUp: jest.Mock;
    import: jest.Mock;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn().mockResolvedValue(undefined),
    };
    csvService = {
      setUp: jest.fn(),
      import: jest.fn().mockReturnValue({ started: true }),
    };
    excelService = {
      setUp: jest.fn(),
      import: jest.fn().mockReturnValue({ started: true }),
    };

    controller = new ImportController(
      {} as never,
      configService as never,
      [] as never,
      csvService as never,
      excelService as never,
      {} as never,
    );
  });

  it('rejects oversized CSV uploads in demo mode', async () => {
    configService.get.mockResolvedValue('true');
    const file = uploadFile('publications.csv', DEMO_UPLOAD_MAX_BYTES + 1);

    await expectApiError(
      controller.importCSV({ user: { username: 'demo' } }, false, file, {} as CSVMapping, true),
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ApiErrorCode.INVALID_REQUEST,
        message: 'In der Demo-Version sind Uploads auf 1 MB begrenzt.',
      },
    );

    expect(csvService.setUp).not.toHaveBeenCalled();
    expect(csvService.import).not.toHaveBeenCalled();
  });

  it('allows larger CSV uploads outside demo mode', async () => {
    configService.get.mockResolvedValue('false');
    const file = uploadFile('publications.csv', DEMO_UPLOAD_MAX_BYTES + 1);

    await expect(
      controller.importCSV({ user: { username: 'alice' } }, true, file, {} as CSVMapping, false),
    ).resolves.toEqual({ started: true });

    expect(csvService.setUp).toHaveBeenCalledWith(file, {});
    expect(csvService.import).toHaveBeenCalledWith(true, 'alice', false);
  });

  it('applies the demo upload limit to XLSX uploads', async () => {
    configService.get.mockResolvedValue(true);
    const file = uploadFile('publications.xlsx', DEMO_UPLOAD_MAX_BYTES + 1);

    await expectApiError(
      controller.importExcel({ user: { username: 'demo' } }, false, file, {} as CSVMapping, false),
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ApiErrorCode.INVALID_REQUEST,
        message: 'In der Demo-Version sind Uploads auf 1 MB begrenzt.',
      },
    );

    expect(excelService.setUp).not.toHaveBeenCalled();
    expect(excelService.import).not.toHaveBeenCalled();
  });
});
