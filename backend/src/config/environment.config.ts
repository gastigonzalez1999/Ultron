import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiEnvironment {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
}

export interface Environment {
  name: string;
  displayName: string;
  description: string;
  apis: {
    [apiName: string]: ApiEnvironment;
  };
  variables: {
    gatewayId: string;
    mpgsMerchantId: string;
    mpgsApiPassword: string;
    mpgsApiUsername: string;
    gpaymentsService: string;
    forterServiceId: string;
    walletGatewayId: string;
    vaultToken: string;
    vaultTokenInbuild3ds: string;
    ottToken: string;
    customerId: string;
    chargeId: string;
    fraudChargeId: string;
    reference: string;
    startDate: string;
    endDate: string;
    pauseDate: string;
    cancelDate: string;
    mpgsService: string;
    webhookUrl: string;
    ntRegistrationIdScof: string;
    ntRegistrationIdVts: string;
    ntServiceIdScof: string;
    ntServiceIdVts: string;
  };
}

@Injectable()
export class EnvironmentConfig {
  private currentEnvironment: string = 'local';

  constructor(private configService: ConfigService) {}

  getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  setCurrentEnvironment(environment: string): void {
    this.currentEnvironment = environment;
  }

  getAvailableEnvironments(): Environment[] {
    return [
      {
        name: 'local',
        displayName: 'Local Development',
        description: 'Local development environment',
        apis: {
          paydock: {
            baseUrl: this.configService.get<string>('PAYDOCK_LOCAL_BASE_URL', 'http://localhost:1337'),
            apiKey: this.configService.get<string>('PAYDOCK_LOCAL_API_KEY'),
            timeout: Number(this.configService.get<string>('API_TIMEOUT', '30000')),
            retries: Number(this.configService.get<string>('API_RETRIES', '3')),
          }
        },
        variables: {
          gatewayId: this.configService.get<string>('GATEWAY_ID_LOCAL'),
          mpgsMerchantId: this.configService.get<string>('MPGS_MERCHANT_ID_LOCAL'),
          mpgsApiPassword: this.configService.get<string>('MPGS_API_PASSWORD_LOCAL'),
          mpgsApiUsername: this.configService.get<string>('MPGS_API_USERNAME_LOCAL'),
          gpaymentsService: this.configService.get<string>('GPAYMENTS_SERVICE_LOCAL'),
          forterServiceId: this.configService.get<string>('FORTER_SERVICE_ID_LOCAL'),
          walletGatewayId: this.configService.get<string>('WALLET_GATEWAY_ID_LOCAL'),
          vaultToken: this.configService.get<string>('VAULT_TOKEN_LOCAL'),
          vaultTokenInbuild3ds: this.configService.get<string>('VAULT_TOKEN_INBUILD_3DS_LOCAL'),
          ottToken: this.configService.get<string>('OTT_TOKEN_LOCAL'),
          customerId: this.configService.get<string>('CUSTOMER_ID_LOCAL'),
          chargeId: this.configService.get<string>('CHARGE_ID_LOCAL'),
          fraudChargeId: this.configService.get<string>('FRAUD_CHARGE_ID_LOCAL'),
          reference: this.configService.get<string>('REFERENCE_LOCAL'),
          startDate: this.configService.get<string>('START_DATE_LOCAL'),
          endDate: this.configService.get<string>('END_DATE_LOCAL'),
          pauseDate: this.configService.get<string>('PAUSE_DATE_LOCAL'),
          cancelDate: this.configService.get<string>('CANCEL_DATE_LOCAL'),
          mpgsService: this.configService.get<string>('MPGS_SERVICE_LOCAL'),
          webhookUrl: this.configService.get<string>('WEBHOOK_URL_LOCAL'),
          ntRegistrationIdScof: this.configService.get<string>('NT_REGISTRATION_ID_SCOF'),
          ntRegistrationIdVts: this.configService.get<string>('NT_REGISTRATION_ID_VTS'),
          ntServiceIdScof: this.configService.get<string>('NT_SERVICE_ID_SCOF'),
          ntServiceIdVts: this.configService.get<string>('NT_SERVICE_ID_VTS'),
        }
      },
      {
        name: 'staging-11',
        displayName: 'Staging-11',
        description: 'Staging-11 environment for testing',
        apis: {
          paydock: {
            baseUrl: this.configService.get<string>('PAYDOCK_STAGING_BASE_URL', 'https://apista-11.paydock.com'),
            apiKey: this.configService.get<string>('PAYDOCK_STAGING_API_KEY'),
            timeout: Number(this.configService.get<string>('API_TIMEOUT', '30000')),
            retries: Number(this.configService.get<string>('API_RETRIES', '3')),
          }
        },
        variables: {
          gatewayId: this.configService.get<string>('GATEWAY_ID_STAGING'),
          mpgsMerchantId: this.configService.get<string>('MPGS_MERCHANT_ID_STAGING'),
          mpgsApiPassword: this.configService.get<string>('MPGS_API_PASSWORD_STAGING'),
          mpgsApiUsername: this.configService.get<string>('MPGS_API_USERNAME_STAGING'),
          gpaymentsService: this.configService.get<string>('GPAYMENTS_SERVICE_STAGING'),
          forterServiceId: this.configService.get<string>('FORTER_SERVICE_ID_STAGING'),
          walletGatewayId: this.configService.get<string>('WALLET_GATEWAY_ID_STAGING'),
          vaultToken: this.configService.get<string>('VAULT_TOKEN_STAGING'),
          vaultTokenInbuild3ds: this.configService.get<string>('VAULT_TOKEN_INBUILD_3DS_STAGING'),
          ottToken: this.configService.get<string>('OTT_TOKEN_STAGING'),
          customerId: this.configService.get<string>('CUSTOMER_ID_STAGING'),
          chargeId: this.configService.get<string>('CHARGE_ID_STAGING'),
          fraudChargeId: this.configService.get<string>('FRAUD_CHARGE_ID_STAGING'),
          reference: this.configService.get<string>('REFERENCE_STAGING'),
          startDate: this.configService.get<string>('START_DATE_STAGING'),
          endDate: this.configService.get<string>('END_DATE_STAGING'),
          pauseDate: this.configService.get<string>('PAUSE_DATE_STAGING'),
          cancelDate: this.configService.get<string>('CANCEL_DATE_STAGING'),
          mpgsService: this.configService.get<string>('MPGS_SERVICE_STAGING'),
          webhookUrl: this.configService.get<string>('WEBHOOK_URL_STAGING_11'),
          ntRegistrationIdScof: this.configService.get<string>('NT_REGISTRATION_ID_SCOF'),
          ntRegistrationIdVts: this.configService.get<string>('NT_REGISTRATION_ID_VTS'),
          ntServiceIdScof: this.configService.get<string>('NT_SERVICE_ID_SCOF'),
          ntServiceIdVts: this.configService.get<string>('NT_SERVICE_ID_VTS'),
        }
      }
    ];
  }

  getApiEnvironment(apiName: string): ApiEnvironment {
    const environments = this.getAvailableEnvironments();
    const currentEnv = environments.find(env => env.name === this.currentEnvironment);

    if (!currentEnv || !currentEnv.apis[apiName]) {
      // Fallback to environment variables
      const baseUrl = this.configService.get<string>(`${apiName.toUpperCase()}_BASE_URL`);
      const apiKey = this.configService.get<string>(`${apiName.toUpperCase()}_API_KEY`);

      return {
        baseUrl: baseUrl || 'https://api.example.com',
        apiKey,
        timeout: Number(this.configService.get<string>('API_TIMEOUT', '30000')),
        retries: Number(this.configService.get<string>('API_RETRIES', '3')),
      };
    }

    return currentEnv.apis[apiName];
  }

  isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }

  getLogLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }
}

