import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { EnvironmentConfig, Environment } from './environment.config';

export class SetEnvironmentDto {
  environment: string;
}

export class EnvironmentResponseDto {
  currentEnvironment: string;
  availableEnvironments: Environment[];
}

@Controller('environment')
export class EnvironmentController {
  private readonly logger = new Logger(EnvironmentController.name);

  constructor(private readonly environmentConfig: EnvironmentConfig) {}

  @Get()
  getEnvironmentInfo(): EnvironmentResponseDto {
    this.logger.log('GET /environment - Fetching environment info');

    const currentEnv = this.environmentConfig.getCurrentEnvironment();
    const availableEnvs = this.environmentConfig.getAvailableEnvironments();

    this.logger.log(`Current environment: ${currentEnv}`);
    this.logger.log(`Available environments: ${availableEnvs.map(e => e.name).join(', ')}`);

    const response = {
      currentEnvironment: currentEnv,
      availableEnvironments: availableEnvs,
    };

    return response;
  }

  @Post('set')
  setEnvironment(@Body() setEnvDto: SetEnvironmentDto): EnvironmentResponseDto {
    this.logger.log(`POST /environment/set - Setting environment to: ${setEnvDto.environment}`);

    this.environmentConfig.setCurrentEnvironment(setEnvDto.environment);

    const currentEnv = this.environmentConfig.getCurrentEnvironment();
    const availableEnvs = this.environmentConfig.getAvailableEnvironments();

    this.logger.log(`Environment set to: ${currentEnv}`);

    const response = {
      currentEnvironment: currentEnv,
      availableEnvironments: availableEnvs,
    };

    return response;
  }
}
