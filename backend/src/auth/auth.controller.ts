import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { AuthService, AuthConfig, ApiAuth } from './auth.service';

export class AddAuthConfigDto {
  apiName: string;
  config: AuthConfig;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('configs')
  listAuthConfigs(): ApiAuth[] {
    return this.authService.listAuthConfigs();
  }

  @Post('configs')
  addAuthConfig(@Body() addAuthDto: AddAuthConfigDto): { success: boolean; message: string } {
    const { apiName, config } = addAuthDto;

    if (!this.authService.validateAuthConfig(config)) {
      return {
        success: false,
        message: 'Invalid authentication configuration',
      };
    }

    this.authService.addAuthConfig(apiName, config);

    return {
      success: true,
      message: `Authentication configuration added for ${apiName}`,
    };
  }

  @Delete('configs/:apiName')
  removeAuthConfig(@Param('apiName') apiName: string): { success: boolean; message: string } {
    this.authService.removeAuthConfig(apiName);

    return {
      success: true,
      message: `Authentication configuration removed for ${apiName}`,
    };
  }

  @Get('validate/:apiName')
  validateAuthConfig(@Param('apiName') apiName: string): { hasConfig: boolean; isValid: boolean } {
    const configs = this.authService.listAuthConfigs();
    const config = configs.find(c => c.apiName === apiName);

    if (!config) {
      return { hasConfig: false, isValid: false };
    }

    return {
      hasConfig: true,
      isValid: this.authService.validateAuthConfig(config.config),
    };
  }
}
