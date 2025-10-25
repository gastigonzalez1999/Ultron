import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    this.logger.log('GET / - Hello endpoint called');
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    this.logger.log('GET /health - Health check called');
    return this.appService.getHealth();
  }

  @Get('test')
  getTest(): { message: string; timestamp: string } {
    this.logger.log('GET /test - Test endpoint called');
    return {
      message: 'Backend is running!',
      timestamp: new Date().toISOString(),
    };
  }
}
