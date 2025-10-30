import { Controller, Post, Body, Get } from '@nestjs/common';
import { SchemaBuilderService, SchemaBuilderRequest, GeneratedSchema } from './schema-builder.service';

export class BuildSchemaDto {
  endpoint: string;
  method: string;
  requestBody?: any;
  responseBody: any;
  statusCode: number;
}

export class BuildSchemaResponseDto {
  schema: GeneratedSchema;
  schemaString: string;
  environmentConfig: string;
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

@Controller('tools/schema-builder')
export class SchemaBuilderController {
  constructor(private readonly schemaBuilderService: SchemaBuilderService) {}

  @Post('build')
  buildSchema(@Body() buildDto: BuildSchemaDto): BuildSchemaResponseDto {
    const schema = this.schemaBuilderService.generateSchemaFromExample(buildDto);
    const schemaString = this.schemaBuilderService.generateSchemaString(schema);
    const environmentConfig = this.schemaBuilderService.generateEnvironmentConfig([schema]);
    const validation = this.schemaBuilderService.validateSchema(schema);

    return {
      schema,
      schemaString,
      environmentConfig,
      validation,
    };
  }

  @Post('build-multiple')
  buildMultipleSchemas(@Body() examples: BuildSchemaDto[]): {
    schemas: GeneratedSchema[];
    environmentConfig: string;
    validation: { isValid: boolean; errors: string[] };
  } {
    const schemas = examples.map(example =>
      this.schemaBuilderService.generateSchemaFromExample(example)
    );

    const environmentConfig = this.schemaBuilderService.generateEnvironmentConfig(schemas);

    const allErrors: string[] = [];
    schemas.forEach((schema, index) => {
      const validation = this.schemaBuilderService.validateSchema(schema);
      if (!validation.isValid) {
        allErrors.push(`Schema ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      schemas,
      environmentConfig,
      validation: {
        isValid: allErrors.length === 0,
        errors: allErrors,
      },
    };
  }

  @Get('example')
  getExample(): {
    example: BuildSchemaDto;
    description: string;
  } {
    return {
      example: {
        endpoint: '/v1/charges',
        method: 'POST',
        requestBody: {
          amount: '10.00',
          currency: 'AUD',
          customer_id: '5e4bfbd86d244b438451fbd7',
          payment_source_id: '5e4bfbc96d244b438451fbd6'
        },
        responseBody: {
          status: 201,
          error: null,
          resource: {
            type: 'charge',
            data: {
              _id: '5ec63451b12c99579e46ee31',
              created_at: '2020-05-21T07:57:05.911Z',
              updated_at: '2020-05-21T07:57:06.565Z',
              amount: 10,
              currency: 'AUD',
              status: 'complete',
              transactions: [
                {
                  _id: '5ec63451b12c99579e46ee32',
                  amount: 10,
                  currency: 'AUD',
                  status: 'complete',
                  type: 'sale'
                }
              ],
              customer: {
                customer_id: '5e4bfbd86d244b438451fbd7',
                first_name: 'Wanda',
                last_name: 'Mertz'
              }
            }
          }
        },
        statusCode: 201
      },
      description: 'Example Paydock charge creation request/response'
    };
  }
}
