import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';

interface DocumentedOperation {
  summary?: string;
  responses?: Record<string, unknown>;
  requestBody?: unknown;
}

describe('OpenAPI document', () => {
  it('documents every operation and typed request body', async () => {
    process.env.IMPORT_QUEUE_MODE = 'inline';
    process.env.IMPORT_STORAGE_MODE = 'memory';
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = testingModule.createNestApplication();
    await app.init();
    const document = createOpenApiDocument(app);
    const missingSummaries: string[] = [];
    const missingResponses: string[] = [];
    const missingRequestBodies: string[] = [];

    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem ?? {})) {
        if (!['get', 'post', 'patch', 'put', 'delete'].includes(method))
          continue;
        const typedOperation = operation as DocumentedOperation;
        const operationName = `${method.toUpperCase()} ${path}`;
        if (!typedOperation.summary) missingSummaries.push(operationName);
        if (Object.keys(typedOperation.responses ?? {}).length === 0) {
          missingResponses.push(operationName);
        }
        if (
          ['post', 'patch', 'put'].includes(method) &&
          path !== '/employee-imports/{id}/retry'
        ) {
          if (!typedOperation.requestBody)
            missingRequestBodies.push(operationName);
        }
      }
    }
    expect(missingSummaries).toEqual([]);
    expect(missingResponses).toEqual([]);
    expect(missingRequestBodies).toEqual([]);
    await app.close();
  });
});
