import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentConfig } from '../config/environment.config';

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'api_key' | 'oauth2';
  token?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface ApiAuth {
  apiName: string;
  config: AuthConfig;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private authConfigs: Map<string, AuthConfig> = new Map();

  constructor(
    private configService: ConfigService,
    private environmentConfig: EnvironmentConfig,
  ) {
    this.loadAuthConfigs();
  }

  private loadAuthConfigs() {
    // Load legacy Paydock authentication from environment variables (fallback)
    const paydockApiKey = this.configService.get<string>('PAYDOCK_API_KEY');
    const paydockToken = this.configService.get<string>('PAYDOCK_TOKEN');

    if (paydockApiKey || paydockToken) {
      this.authConfigs.set('paydock', {
        type: paydockApiKey ? 'api_key' : 'bearer',
        apiKey: paydockApiKey,
        token: paydockToken,
      });
    }
  }

  getAuthHeaders(apiName: string): Record<string, string> {
    // First try to get API key from current environment configuration
    if (apiName === 'paydock' || apiName.includes('paydock')) {
      const currentEnv = this.environmentConfig.getApiEnvironment('paydock');
      if (currentEnv && currentEnv.apiKey) {
        return {
          'x-user-secret-key': currentEnv.apiKey,
        };
      }
    }

    // Fallback to legacy auth configs
    const config = this.authConfigs.get(apiName);
    if (!config) {
      return {};
    }

    const headers: Record<string, string> = {};

    switch (config.type) {
      case 'bearer':
        if (config.token) {
          headers['Authorization'] = `Bearer ${config.token}`;
        }
        break;

      case 'basic':
        if (config.username && config.password) {
          const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'api_key':
        if (config.apiKey) {
          headers['x-user-secret-key'] = config.apiKey;
        }
        break;

      case 'oauth2':
        if (config.token) {
          headers['Authorization'] = `Bearer ${config.token}`;
        }
        break;
    }

    return headers;
  }

  addAuthConfig(apiName: string, config: AuthConfig) {
    this.authConfigs.set(apiName, config);
    this.logger.log(`Added auth config for ${apiName}`);
  }

  removeAuthConfig(apiName: string) {
    this.authConfigs.delete(apiName);
    this.logger.log(`Removed auth config for ${apiName}`);
  }

  listAuthConfigs(): ApiAuth[] {
    return Array.from(this.authConfigs.entries()).map(([apiName, config]) => ({
      apiName,
      config,
    }));
  }

  validateAuthConfig(config: AuthConfig): boolean {
    switch (config.type) {
      case 'bearer':
        return !!config.token;
      case 'basic':
        return !!(config.username && config.password);
      case 'api_key':
        return !!config.apiKey;
      case 'oauth2':
        return !!(config.clientId && config.clientSecret);
      default:
        return false;
    }
  }

  async refreshOAuthToken(clientId: string, clientSecret: string): Promise<string | null> {
    try {
      // This is a placeholder for OAuth2 token refresh logic
      // In a real implementation, you would make a request to the OAuth provider
      this.logger.log(`Refreshing OAuth token for client ${clientId}`);

      // For now, return null to indicate no refresh needed
      return null;
    } catch (error) {
      this.logger.error(`Failed to refresh OAuth token: ${error.message}`);
      return null;
    }
  }
}
