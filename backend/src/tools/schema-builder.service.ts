import { Injectable } from '@nestjs/common';

export interface SchemaBuilderRequest {
  endpoint: string;
  method: string;
  requestBody?: any;
  responseBody: any;
  statusCode: number;
}

export interface GeneratedSchema {
  endpoint: string;
  method: string;
  expectedStatus: number[];
  requiredFields: string[];
  responseSchema: Record<string, any>;
}

@Injectable()
export class SchemaBuilderService {

  generateSchemaFromExample(example: SchemaBuilderRequest): GeneratedSchema {
    const requiredFields = this.extractRequiredFields(example.responseBody);
    const responseSchema = this.generateJsonSchema(example.responseBody);

    return {
      endpoint: example.endpoint,
      method: example.method,
      expectedStatus: [example.statusCode],
      requiredFields,
      responseSchema,
    };
  }

  private extractRequiredFields(obj: any, path: string = ''): string[] {
    const fields: string[] = [];

    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Consider all fields as required for now
        // You can customize this logic based on your needs
        if (value !== null && value !== undefined) {
          fields.push(currentPath);

          // Recursively extract nested fields
          if (typeof value === 'object' && !Array.isArray(value)) {
            fields.push(...this.extractRequiredFields(value, currentPath));
          }
        }
      }
    }

    return fields;
  }

  private generateJsonSchema(obj: any): Record<string, any> {
    if (obj === null || obj === undefined) {
      return { type: 'null' };
    }

    if (typeof obj === 'string') {
      return { type: 'string' };
    }

    if (typeof obj === 'number') {
      return { type: 'number' };
    }

    if (typeof obj === 'boolean') {
      return { type: 'boolean' };
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return { type: 'array', items: {} };
      }

      return {
        type: 'array',
        items: this.generateJsonSchema(obj[0]),
      };
    }

    if (typeof obj === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(obj)) {
        properties[key] = this.generateJsonSchema(value);

        // Consider all fields as required
        if (value !== null && value !== undefined) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required,
      };
    }

    return { type: 'string' };
  }

  generateSchemaString(schema: GeneratedSchema): string {
    return JSON.stringify(schema, null, 2);
  }

  generateEnvironmentConfig(schemas: GeneratedSchema[]): string {
    const schemasJson = JSON.stringify(schemas, null, 2);
    return `VALIDATION_SCHEMAS=${schemasJson}`;
  }

  validateSchema(schema: GeneratedSchema): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema.endpoint) {
      errors.push('Endpoint is required');
    }

    if (!schema.method) {
      errors.push('Method is required');
    }

    if (!schema.expectedStatus || schema.expectedStatus.length === 0) {
      errors.push('Expected status codes are required');
    }

    if (!schema.responseSchema) {
      errors.push('Response schema is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
