import { Injectable, Logger } from '@nestjs/common';
import { EnvironmentConfig } from '../config/environment.config';
import { AuthService } from '../auth/auth.service';
import { randomUUID } from 'crypto';

export interface ExecutionResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  duration?: number;
  timestamp: Date;
}

export interface TestStepExecution {
  step: number;
  description: string;
  result: ExecutionResult;
  apiCall?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  dashboardAction?: string;
}

export interface Step {
  step: number;
  description: string;
  apiCall?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  dashboardAction?: string;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly environmentConfig: EnvironmentConfig,
    private readonly authService: AuthService,
  ) {}

  /**
   * Generates a unique reference for API calls
   * @param prefix Optional prefix for the reference
   * @returns A unique reference string
   */
  private generateUniqueReference(prefix: string = 'REF'): string {
    const uuid = randomUUID().replace(/-/g, '').substring(0, 12);
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}_${timestamp}_${uuid}`;
  }

  /**
   * Generates a full UUID for 3DS flows (36 characters)
   * @returns A full UUID string
   */
  private generateFullUUID(): string {
    return randomUUID();
  }

  async executeApiCall(apiCall: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  }): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing ${apiCall.method} ${apiCall.url}`);


      // Get environment configuration
      const apiName = this.extractApiName(apiCall.url);
      const env = this.environmentConfig.getApiEnvironment(apiName);

      // Add authentication headers
      const headers = { ...apiCall.headers };
      const authHeaders = this.authService.getAuthHeaders(apiName);
      Object.assign(headers, authHeaders);

      // Ensure Content-Type is set for POST/PUT requests with body
      if ((apiCall.method === 'POST' || apiCall.method === 'PUT') && apiCall.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(apiCall.url, {
        method: apiCall.method,
        headers,
        body: apiCall.body ? JSON.stringify(apiCall.body) : undefined,
        signal: AbortSignal.timeout(env.timeout),
      });

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      // Log full response for gateway creation errors
      if (apiCall.url.includes('/v1/gateways') && apiCall.method === 'POST' && !response.ok) {
        this.logger.error('❌ GATEWAY CREATION FAILED - Full response:');
        this.logger.error('Status:', response.status);
        this.logger.error('Status Text:', response.statusText);
        this.logger.error('Response Body:', JSON.stringify(responseData, null, 2));
      }

      // Log full response for vault token creation errors
      if (apiCall.url.includes('/v1/vault/payment_sources') && apiCall.method === 'POST' && !response.ok) {
        this.logger.error('❌ VAULT TOKEN CREATION FAILED - Full response:');
        this.logger.error('Status:', response.status);
        this.logger.error('Status Text:', response.statusText);
        this.logger.error('Response Body:', JSON.stringify(responseData, null, 2));
      }

      // Log full response for charge creation errors
      if (apiCall.url.includes('/v1/charges') && apiCall.method === 'POST' && !response.ok) {
        this.logger.error('❌ CHARGE CREATION FAILED - Full response:');
        this.logger.error('Status:', response.status);
        this.logger.error('Status Text:', response.statusText);
        this.logger.error('Response Body:', JSON.stringify(responseData, null, 2));
      }

      const duration = Date.now() - startTime;

      // Include response body in error for non-2xx status codes
      if (!response.ok) {
        const errorMessage = typeof responseData === 'object' && responseData.error
          ? responseData.error.message || JSON.stringify(responseData.error)
          : typeof responseData === 'string'
            ? responseData
            : JSON.stringify(responseData);

        // Provide helpful error messages for common status codes
        let enhancedErrorMessage = `HTTP ${response.status}: ${errorMessage}`;

        if (response.status === 403) {
          if (errorMessage.includes('service unavailable') || errorMessage.includes('Actions with this service unavailable')) {
            enhancedErrorMessage = `HTTP 403: ${errorMessage}\n\n` +
              `This error typically means:\n` +
              `• The MPGS gateway type is not enabled in your Paydock account\n` +
              `• You don't have permission to create gateways\n` +
              `• The service needs to be enabled by Paydock support\n\n` +
              `Please contact Paydock support to enable MPGS gateway creation for your account.`;
          } else {
            enhancedErrorMessage = `HTTP 403: ${errorMessage}\n\n` +
              `Access forbidden. Check your API key permissions and account settings.`;
          }
        } else if (response.status === 401) {
          enhancedErrorMessage = `HTTP 401: ${errorMessage}\n\n` +
            `Authentication failed. Please verify your API key (secretKey) is correct.`;
        } else if (response.status === 400) {
          enhancedErrorMessage = `HTTP 400: ${errorMessage}\n\n` +
            `Bad request. Check that all required fields are provided and correctly formatted.`;
        }

        return {
          success: false,
          statusCode: response.status,
          response: responseData,
          error: enhancedErrorMessage,
          duration,
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        statusCode: response.status,
        response: responseData,
        duration,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`API call failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        duration,
        timestamp: new Date(),
      };
    }
  }

  async executeTestSteps(testSteps: any[]): Promise<TestStepExecution[]> {
    // Get current environment variables for substitution
    const environments = this.environmentConfig.getAvailableEnvironments();
    const currentEnv = environments.find(env => env.name === this.environmentConfig.getCurrentEnvironment());
    const variableMap = {
      ...(currentEnv?.variables || {}),
      baseUrl: currentEnv?.apis?.paydock?.baseUrl,
      secretKey: currentEnv?.apis?.paydock?.apiKey,
    };

    // Track missing critical variables
    const missingVariables: string[] = [];

    // Substitute variables in all steps before execution
    const substitute = (value: string): string => {
      return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        // Special handling for 3DS references (must be full UUID)
        if (key === '3dsReference' || key === 'standalone3dsReference') {
          const fullUuid = this.generateFullUUID();
          this.logger.log(`Generated full UUID for 3DS: ${fullUuid}`);
          return fullUuid;
        }

        // Special handling for unique references
        if (key === 'reference' || key === 'uniqueReference') {
          return this.generateUniqueReference();
        }

        // Handle prefixed unique references (e.g., {{chargeReference}}, {{subscriptionReference}})
        if (key.endsWith('Reference') && key !== 'reference' && key !== '3dsReference' && key !== 'standalone3dsReference') {
          const prefix = key.replace('Reference', '').toUpperCase();
          return this.generateUniqueReference(prefix);
        }

        const variableValue = variableMap[key];
        if (variableValue === undefined || variableValue === null || variableValue === '') {
          // Track missing critical variables (MPGS credentials, API keys, etc.)
          const criticalVariables = ['mpgsMerchantId', 'mpgsApiPassword', 'mpgsApiUsername', 'secretKey', 'baseUrl'];
          if (criticalVariables.includes(key) && !missingVariables.includes(key)) {
            missingVariables.push(key);
          }

          // Log warning for missing variables
          this.logger.warn(`⚠️ Variable ${key} is not defined in environment ${this.environmentConfig.getCurrentEnvironment()}, using placeholder`);

          // Provide fallback values for common variables
          const fallbacks: Record<string, string> = {
            fraudChargeId: 'test_fraud_charge_id',
            vaultToken: 'test_vault_token',
            vaultTokenInbuild3ds: 'test_vault_token_inbuild_3ds',
            gatewayId: 'test_gateway_id',
            customerId: 'test_customer_id',
            chargeId: 'test_charge_id',
            token: 'test_token',
            ottToken: 'test_ott_token',
            reference: 'test_reference',
            gpayments: 'test_gpayments_service',
            webhookUrl: 'https://webhook.site/test',
          };

          return fallbacks[key] || `placeholder_${key}`;
        }
        return variableValue;
      });
    };

    // Function to substitute step response variables
    const substituteStepResponse = (value: string): string => {
      return value.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        // Special handling for unique references (must be generated, not from env vars)
        if (key === 'reference' || key === 'uniqueReference') {
          const uniqueRef = this.generateUniqueReference();
          this.logger.log(`Generated unique reference: ${uniqueRef}`);
          return uniqueRef;
        }

        // Handle prefixed unique references (e.g., {{chargeReference}}, {{subscriptionReference}})
        if (key.endsWith('Reference') && key !== 'reference' && key !== '3dsReference' && key !== 'standalone3dsReference') {
          const prefix = key.replace('Reference', '').toUpperCase();
          const uniqueRef = this.generateUniqueReference(prefix);
          this.logger.log(`Generated prefixed unique reference: ${uniqueRef}`);
          return uniqueRef;
        }

        // Handle conditional expressions with || (fallback)
        // e.g., {{step2._id || step3._id}}
        if (key.includes(' || ')) {
          const options = key.split(' || ').map(k => k.trim());
          for (const option of options) {
            const result = substituteStepResponse(`{{${option}}}`);
            // If we got a real value (not a placeholder), use it
            if (result && !result.startsWith('placeholder_')) {
              return result;
            }
          }
          // All options failed, return placeholder
          this.logger.warn(`All conditional options failed for: ${key}`);
          return `placeholder_${key.replace(/ \|\| /g, '_or_')}`;
        }

        // Handle ternary expressions (basic support)
        // e.g., {{step2._id ? "existing" : "new"}}
        if (key.includes(' ? ') && key.includes(' : ')) {
          const [condition, values] = key.split(' ? ');
          const [trueValue, falseValue] = values.split(' : ');

          // Check if condition is truthy
          const conditionResult = substituteStepResponse(`{{${condition.trim()}}}`);
          if (conditionResult && !conditionResult.startsWith('placeholder_')) {
            return trueValue.trim().replace(/['"]/g, '');
          } else {
            return falseValue.trim().replace(/['"]/g, '');
          }
        }

        // Check if this is a step response reference (e.g., step1.one_time_token)
        if (key.includes('.')) {
          const parts = key.split('.');
          const stepKey = parts[0];
          const fieldKey = parts.slice(1).join('.');
          const stepMatch = stepKey.match(/step(\d+)/);
          if (stepMatch) {
            const stepNumber = parseInt(stepMatch[1]);

            // Convert the field key to match the stored format
            // e.g., "transactions.0.external_id" -> "transactions_0_external_id"
            const convertedFieldKey = fieldKey.replace(/\./g, '_');

            // First try to get the specific extracted variable with converted key
            const extractedKey = `${stepNumber}_${convertedFieldKey}`;

            if (stepResponses[extractedKey] !== undefined) {
              return String(stepResponses[extractedKey]);
            }

            // Try alternative key formats for backward compatibility (only for simple fields)
            if (!fieldKey.includes('.')) {
              const alternativeKeys = [
                `${stepNumber}${fieldKey}`, // e.g., "1_id"
                `${stepNumber}_${fieldKey.replace(/^_/, '')}`, // e.g., "1_id" (remove leading underscore)
                `${stepNumber}_${fieldKey.replace(/^_/, 'id')}`, // e.g., "1_id" (replace leading underscore with "id")
              ];

              for (const altKey of alternativeKeys) {
                if (stepResponses[altKey] !== undefined) {
                  return String(stepResponses[altKey]);
                }
              }
            }

            // Fall back to navigating the full response
            const stepResponse = stepResponses[stepNumber];
            if (stepResponse) {
              // Navigate to the field in the step response
              const parts = fieldKey.split('.');
              let fieldValue = stepResponse;
              for (const part of parts) {
                if (fieldValue && typeof fieldValue === 'object') {
                  fieldValue = fieldValue[part];
                } else {
                  fieldValue = undefined;
                  break;
                }
              }
              if (fieldValue !== undefined) {
                return String(fieldValue);
              }
            }
          }
        }

        // Fall back to regular variable substitution
        const variableValue = variableMap[key];
        if (variableValue === undefined || variableValue === null || variableValue === '') {
          return `placeholder_${key}`;
        }
        return variableValue;
      });
    };
    const substituteObject = (obj: any): any => {
      if (typeof obj === 'string') return substitute(obj);
      if (Array.isArray(obj)) return obj.map(substituteObject);
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = substituteObject(value);
        }
        return result;
      }
      return obj;
    };

    const substituteStepResponseObject = (obj: any, stepNumber?: number): any => {
      if (typeof obj === 'string') {
        const result = substituteStepResponse(obj);
        return result;
      }
      if (Array.isArray(obj)) return obj.map(item => substituteStepResponseObject(item, stepNumber));
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const substitutedValue = substituteStepResponseObject(value, stepNumber);
          // Remove placeholder values from credentials objects (e.g., api_username if not provided)
          if (key === 'credentials' && typeof substitutedValue === 'object' && substitutedValue !== null) {
            const cleanedCredentials: any = {};
            for (const [credKey, credValue] of Object.entries(substitutedValue)) {
              // Only include credential if it's not a placeholder
              if (typeof credValue === 'string' && !credValue.startsWith('placeholder_')) {
                cleanedCredentials[credKey] = credValue;
              } else if (typeof credValue !== 'string') {
                cleanedCredentials[credKey] = credValue;
              }
            }
            result[key] = cleanedCredentials;
          } else {
            result[key] = substitutedValue;
          }
        }
        return result;
      }
      return obj;
    };
    const substitutedSteps = testSteps.map(step => ({
      ...step,
      apiCall: step.apiCall ? {
        ...step.apiCall,
        url: substitute(step.apiCall.url),
        headers: substituteObject(step.apiCall.headers),
        // Don't substitute step response variables here - they will be substituted during execution
        body: step.apiCall.body,
      } : undefined,
    }));

    // Use substitutedSteps for execution
    const results: TestStepExecution[] = [];
    const stepResponses: Record<number, any> = {};
    const extractedVariables: Record<string, any> = {};
    const executedSteps = new Set<number>();
    const stepMap = new Map<number, any>();
    // Substitute variables in outgoingEdges.condition.value for each step
    const fullySubstitutedSteps = substitutedSteps.map(step => {
      let outgoingEdges = step.outgoingEdges;
      if (outgoingEdges) {
        outgoingEdges = outgoingEdges.map(edge => {
          if (edge.condition && typeof edge.condition.value === 'string') {
            return {
              ...edge,
              condition: {
                ...edge.condition,
                value: substitute(edge.condition.value)
              }
            };
          }
          return edge;
        });
      }
      return {
        ...step,
        outgoingEdges
      };
    });
    fullySubstitutedSteps.forEach(step => stepMap.set(step.step, step));

    // Helper function to update variableMap with extractedVariables after each step
    const updateVariableMap = () => {
      Object.assign(variableMap, extractedVariables);
    };

    // Helper function to determine next steps based on outgoing edges
    const getNextSteps = (currentStep: any, stepResponses: Record<number, any>): number[] => {
      if (!currentStep.outgoingEdges || currentStep.outgoingEdges.length === 0) {
        // Fallback to sequential execution for backward compatibility
        const currentIndex = testSteps.findIndex(s => s.step === currentStep.step);
        if (currentIndex < testSteps.length - 1) {
          return [testSteps[currentIndex + 1].step];
        }
        return [];
      }

      const nextSteps: number[] = [];
      let elseStep: number | null = null;

      // Evaluate each outgoing edge
      for (const edge of currentStep.outgoingEdges) {
        if (edge.isElse) {
          // Mark this as the else path
          elseStep = edge.targetStep;
          continue;
        }

        if (edge.condition) {
          // Evaluate the condition
          const prevStepNum = edge.condition.stepNumber;
          const prevResult = stepResponses[prevStepNum];
          let fieldValue = prevResult;

          // Support nested fields (e.g., resource.data.status)
          if (prevResult && edge.condition.field) {
            const parts = edge.condition.field.split('.');
            for (const part of parts) {
              if (fieldValue && typeof fieldValue === 'object') {
                fieldValue = fieldValue[part];
              } else {
                fieldValue = undefined;
                break;
              }
            }
          }

          let conditionMet = false;
          switch (edge.condition.operator) {
            case 'equals':
              conditionMet = String(fieldValue) === String(edge.condition.value);
              break;
            case 'not_equals':
              // Handle null/undefined checks
              if (edge.condition.value === null || edge.condition.value === undefined) {
                conditionMet = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
              } else {
                conditionMet = String(fieldValue) !== String(edge.condition.value);
              }
              break;
            case 'contains':
              conditionMet = typeof fieldValue === 'string' && fieldValue.includes(edge.condition.value);
              break;
            case 'greater_than':
              conditionMet = Number(fieldValue) > Number(edge.condition.value);
              break;
            case 'less_than':
              conditionMet = Number(fieldValue) < Number(edge.condition.value);
              break;
          }

          if (conditionMet) {
            nextSteps.push(edge.targetStep);
          }
        } else {
          // No condition - default path
          nextSteps.push(edge.targetStep);
        }
      }

      // If no conditions were met and there's an else path, use it
      if (nextSteps.length === 0 && elseStep !== null) {
        nextSteps.push(elseStep);
      }

      return nextSteps;
    };

    // Helper function to execute a single step
    const executeStep = async (stepNumber: number): Promise<void> => {
      if (executedSteps.has(stepNumber)) {
        return; // Already executed
      }

      const step = stepMap.get(stepNumber);
      if (!step) {
        return; // Step not found
      }

      this.logger.log(`Executing step ${step.step}: ${step.description}`);
      executedSteps.add(stepNumber);

            // Substitute step response variables in the current step before execution
      let stepToExecute = { ...step };
      if (stepToExecute.apiCall) {
        const substitutedBody = stepToExecute.apiCall.body ? substituteStepResponseObject(stepToExecute.apiCall.body, stepToExecute.step) : undefined;

        stepToExecute.apiCall = {
          ...stepToExecute.apiCall,
          url: substituteStepResponse(stepToExecute.apiCall.url),
          headers: substituteStepResponseObject(stepToExecute.apiCall.headers, stepToExecute.step),
          body: substitutedBody,
        };
      }

      let result: ExecutionResult;

      if (stepToExecute.apiCall) {
        // Check for placeholders in API call body (especially for gateway creation and vault tokens)
        const bodyString = JSON.stringify(stepToExecute.apiCall.body || {});
        const placeholderMatches = bodyString.match(/placeholder_(\w+)/g);

        // Also check for step reference placeholders that failed to resolve
        const stepPlaceholderMatches = bodyString.match(/placeholder_(step\d+)/g);
        if (stepPlaceholderMatches) {
          const uniquePlaceholders = [...new Set(stepPlaceholderMatches.map(m => m.replace('placeholder_', '')))];
          this.logger.error(`❌ Step ${stepToExecute.step} contains unresolved step references: ${uniquePlaceholders.join(', ')}`);
          this.logger.error(`Available step responses:`, Object.keys(stepResponses));

          result = {
            success: false,
            error: `Failed to resolve step references: ${uniquePlaceholders.join(', ')}\n\n` +
                   `This usually means a previous step failed or didn't return the expected data.\n` +
                   `Check the previous steps to ensure they completed successfully.`,
            timestamp: new Date(),
          };

          results.push({
            step: stepToExecute.step,
            description: stepToExecute.description,
            result,
            apiCall: stepToExecute.apiCall,
            dashboardAction: stepToExecute.dashboardAction,
          });

          stepResponses[stepToExecute.step] = null;
          return;
        }

        if (placeholderMatches) {
          const uniquePlaceholders = [...new Set(placeholderMatches.map(m => m.replace('placeholder_', '')))];
          const envName = this.environmentConfig.getCurrentEnvironment();
          const envPrefix = envName === 'local' ? 'LOCAL' : envName === 'staging-11' ? 'STAGING' : 'STAGING';

          this.logger.error(`❌ Step ${stepToExecute.step} contains placeholder values: ${uniquePlaceholders.join(', ')}`);

          // Create a helpful error message
          const missingVars = uniquePlaceholders.map(v => {
            // Map camelCase to UPPER_SNAKE_CASE for env var names
            // Handle special cases like mpgsMerchantId -> MPGS_MERCHANT_ID
            let envVarName = v;
            // Handle MPGS prefix specially
            if (v.startsWith('mpgs')) {
              envVarName = 'MPGS_' + v.substring(4).replace(/([A-Z])/g, '_$1');
            } else {
              envVarName = v.replace(/([A-Z])/g, '_$1');
            }
            return `${envVarName.toUpperCase()}_${envPrefix}`;
          });

          result = {
            success: false,
            error: `Missing required environment variables: ${missingVars.join(', ')}\n\n` +
                   `Please configure these in your backend/.env file:\n` +
                   missingVars.map(v => `${v}=your_${v.toLowerCase().replace(/_/g, '_')}_value_here`).join('\n') +
                   `\n\nCurrent environment: ${envName}\n` +
                   `\nExample for local environment:\n` +
                   missingVars.map(v => `${v}=your_actual_value`).join('\n'),
            timestamp: new Date(),
          };

          // Add result and skip to end of function
          results.push({
            step: stepToExecute.step,
            description: stepToExecute.description,
            result,
            apiCall: stepToExecute.apiCall,
            dashboardAction: stepToExecute.dashboardAction,
          });

          // Skip API execution, but continue to variable extraction (which will be empty)
          stepResponses[stepToExecute.step] = null;
          return;
        }

        // Handle retry logic for API calls
        const retryConfig = stepToExecute.retryConfig;
        let attempt = 1;
        const maxAttempts = retryConfig?.maxAttempts || 1;
        const baseDelay = retryConfig?.delayMs || 1000;
        const backoffMultiplier = retryConfig?.backoffMultiplier || 1;

        while (attempt <= maxAttempts) {
          try {
            this.logger.log(`Step ${stepToExecute.step} attempt ${attempt}/${maxAttempts}`);
            result = await this.executeApiCall(stepToExecute.apiCall);

            // If successful, break out of retry loop
            if (result.success) {
              break;
            }

            // If failed and we have more attempts, retry
            if (attempt < maxAttempts) {
              const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
              this.logger.log(`Step ${stepToExecute.step} failed, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            this.logger.error(`Step ${stepToExecute.step} attempt ${attempt} failed with error:`, error);

            // If we have more attempts, retry
            if (attempt < maxAttempts) {
              const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
              this.logger.log(`Step ${stepToExecute.step} failed, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // Last attempt failed, create error result
              result = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
              };
            }
          }
          attempt++;
        }
      } else if (stepToExecute.dashboardAction) {
        // For dashboard actions, just mark as successful
        result = {
          success: true,
          timestamp: new Date(),
        };
      } else {
        // For steps without apiCall or dashboardAction, mark as failed
        result = {
          success: false,
          error: 'Invalid step format',
          timestamp: new Date(),
        };
      }

      results.push({
        step: stepToExecute.step,
        description: stepToExecute.description,
        result,
        apiCall: stepToExecute.apiCall,
        dashboardAction: stepToExecute.dashboardAction,
      });

      // Store the full response for step response variable substitution
      stepResponses[stepToExecute.step] = result.response;

      // Also store extracted variables for easier access
      if (result.response && result.response.resource && result.response.resource.data) {
        const data = result.response.resource.data;

        // For one-time token creation responses, the token is in resource.data
        if (result.response.resource.type === 'token' && typeof data === 'string') {
          stepResponses[`${stepToExecute.step}_one_time_token`] = data;
        }
        // Also check if the token is in resource.data.one_time_token
        if (result.response.resource.type === 'token' && data.one_time_token) {
          stepResponses[`${stepToExecute.step}_one_time_token`] = data.one_time_token;
        }
      }

      // Comprehensive variable extraction from responses
      if (result.response && result.response.resource && result.response.resource.data) {
        const data = result.response.resource.data;

        // Extract charge_id from any response with _id (not just 'charge' type)
        if (data._id) {
          // Extract based on resource type or use generic charge_id
          const resourceType = result.response.resource.type;
          if (resourceType === 'charge' || resourceType === '3ds') {
            extractedVariables.charge_id = data._id;
          }
          // Also extract as generic resource ID
          extractedVariables[`${resourceType}_id`] = data._id;
        }

        // Extract 3DS-specific fields for all 3DS responses
        if (data._3ds) {
          if (data._3ds.id) {
            extractedVariables['3ds_id'] = data._3ds.id;
          }
          if (data._3ds.token) {
            extractedVariables['3ds_token'] = data._3ds.token;
          }
        }

        // Extract vault_token from various possible locations
        if (data.vault_token) {
          extractedVariables.vault_token = data.vault_token;
        }
        if (data.payment_source && data.payment_source.vault_token) {
          extractedVariables.vault_token = data.payment_source.vault_token;
        }
        // For vault token creation responses, the vault token is in resource.data.vault_token
        if (result.response.resource.type === 'vault-token' && data.vault_token) {
          extractedVariables.vault_token = data.vault_token;
        }

        // Extract payment source tokens from customer creation responses
        if (data.payment_sources && Array.isArray(data.payment_sources) && data.payment_sources.length > 0) {
          const paymentSource = data.payment_sources[0]; // Get the first payment source
          if (paymentSource.ref_token) {
            extractedVariables.ref_token = paymentSource.ref_token;
          }
          if (paymentSource.vault_token) {
            extractedVariables.vault_token = paymentSource.vault_token;
          }
        }

        // For one-time token creation responses, the token is in resource.data
        if (result.response.resource.type === 'token' && typeof data === 'string') {
          extractedVariables.one_time_token = data;
        }
        // Also check if the token is in resource.data.one_time_token
        if (result.response.resource.type === 'token' && data.one_time_token) {
          extractedVariables.one_time_token = data.one_time_token;
        }


        // Extract customer_id if present
        if (data.customer_id) {
          extractedVariables.customer_id = data.customer_id;
        }
        if (data._id && result.response.resource.type === 'customer') {
          extractedVariables.customer_id = data._id;
        }

        // Extract gateway_id if present
        if (data.gateway_id) {
          extractedVariables.gateway_id = data.gateway_id;
        }
        if (data._id && result.response.resource.type === 'gateway') {
          extractedVariables.gateway_id = data._id;
        }

        // Store extracted variables in stepResponses for step response substitution
        if (data._id) {
          stepResponses[`${stepToExecute.step}_id`] = data._id;
          stepResponses[`${stepToExecute.step}__id`] = data._id; // Also store with double underscore for compatibility
        }
        if (data.external_id) {
          stepResponses[`${stepToExecute.step}_external_id`] = data.external_id;
        }
        // Extract transaction external_id if available
        if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0 && data.transactions[0].external_id) {
          stepResponses[`${stepToExecute.step}_transactions_0_external_id`] = data.transactions[0].external_id;
        }
        if (data.customer_id) {
          stepResponses[`${stepToExecute.step}_customer_id`] = data.customer_id;
        }
        if (data.gateway_id) {
          stepResponses[`${stepToExecute.step}_gateway_id`] = data.gateway_id;
        }
        if (data.vault_token) {
          stepResponses[`${stepToExecute.step}_vault_token`] = data.vault_token;
        }
        if (data.one_time_token) {
          stepResponses[`${stepToExecute.step}_one_time_token`] = data.one_time_token;
        }
      }

      // Update variableMap after extraction
      updateVariableMap();

      // Add a small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get next steps and execute them
      const nextSteps = getNextSteps(stepToExecute, stepResponses);
      for (const nextStepNumber of nextSteps) {
        await executeStep(nextStepNumber);
      }
    };

    // Start execution from the first step
    if (testSteps.length > 0) {
      await executeStep(testSteps[0].step);
    }

    return results;
  }

  async executeSingleStep(step: any, previousResults: TestStepExecution[]): Promise<{ result: TestStepExecution; nextSteps: number[] }> {
    this.logger.log(`Executing single step ${step.step}: ${step.description}`);

    let result: ExecutionResult;

    if (step.apiCall) {
      result = await this.executeApiCall(step.apiCall);
    } else if (step.dashboardAction) {
      // For dashboard actions, just mark as successful
      result = {
        success: true,
        timestamp: new Date(),
      };
    } else {
      // For steps without apiCall or dashboardAction, mark as failed
      result = {
        success: false,
        error: 'Invalid step format',
        timestamp: new Date(),
      };
    }

    const stepExecution: TestStepExecution = {
      step: step.step,
      description: step.description,
      result,
      apiCall: step.apiCall,
      dashboardAction: step.dashboardAction,
    };

    // Build step responses from previous results for next step calculation
    const stepResponses: Record<number, any> = {};
    previousResults.forEach(prevResult => {
      stepResponses[prevResult.step] = prevResult.result.response;
    });
    stepResponses[step.step] = result.response;

    // Calculate next steps based on the current step's outgoing edges
    const nextSteps = this.getNextStepsForStep(step, stepResponses);

    return {
      result: stepExecution,
      nextSteps,
    };
  }

  private getNextStepsForStep(currentStep: any, stepResponses: Record<number, any>): number[] {
    if (!currentStep.outgoingEdges || currentStep.outgoingEdges.length === 0) {
      // For steps without outgoing edges, return empty array
      return [];
    }

    const nextSteps: number[] = [];
    let elseStep: number | null = null;

    // Evaluate each outgoing edge
    for (const edge of currentStep.outgoingEdges) {
      if (edge.isElse) {
        // Mark this as the else path
        elseStep = edge.targetStep;
        continue;
      }

      if (edge.condition) {
        // Evaluate the condition
        const prevStepNum = edge.condition.stepNumber;
        const prevResult = stepResponses[prevStepNum];
        let fieldValue = prevResult;

        // Support nested fields (e.g., resource.data.status)
        if (prevResult && edge.condition.field) {
          // Remove "response." prefix if present, since stepResponses already contains the response
          let fieldPath = edge.condition.field;
          if (fieldPath.startsWith('response.')) {
            fieldPath = fieldPath.substring('response.'.length);
          }

          const parts = fieldPath.split('.');
          for (const part of parts) {
            if (fieldValue && typeof fieldValue === 'object') {
              fieldValue = fieldValue[part];
            } else {
              fieldValue = undefined;
              break;
            }
          }
        }

        let conditionMet = false;
        switch (edge.condition.operator) {
          case 'equals':
            // Special handling: if value is the field itself, check if field exists (truthy)
            if (edge.condition.value === fieldValue ||
                (typeof edge.condition.value === 'string' && edge.condition.value === edge.condition.field)) {
              conditionMet = !!fieldValue;
            } else {
              conditionMet = fieldValue == edge.condition.value;
            }
            break;
          case 'not_equals':
            conditionMet = fieldValue != edge.condition.value;
            break;
          case 'contains':
            conditionMet = typeof fieldValue === 'string' && fieldValue.includes(edge.condition.value);
            break;
          case 'greater_than':
            conditionMet = Number(fieldValue) > Number(edge.condition.value);
            break;
          case 'less_than':
            conditionMet = Number(fieldValue) < Number(edge.condition.value);
            break;
        }

        if (conditionMet) {
          nextSteps.push(edge.targetStep);
        }
      } else {
        // No condition - default path
        nextSteps.push(edge.targetStep);
      }
    }

    // If no conditions were met and there's an else path, use it
    if (nextSteps.length === 0 && elseStep !== null) {
      nextSteps.push(elseStep);
    }

    return nextSteps;
  }

  private extractApiName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.split('.')[0]; // Extract first part of hostname
    } catch {
      return 'default';
    }
  }
}
