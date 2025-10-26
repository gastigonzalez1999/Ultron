import { Controller, Post, Body } from '@nestjs/common';
import { ExecutionService, TestStepExecution } from './execution.service';

export class ExecuteStepsDto {
  testSteps: any[];
}

export class ExecuteStepsResponseDto {
  results: TestStepExecution[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalDuration: number;
  };
}

@Controller('execution')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Post('execute')
  async executeSteps(@Body() executeDto: ExecuteStepsDto): Promise<ExecuteStepsResponseDto> {
    const results = await this.executionService.executeTestSteps(executeDto.testSteps);

    const successfulSteps = results.filter(r => r.result.success).length;
    const totalDuration = results.reduce((sum, r) => sum + (r.result.duration || 0), 0);

    return {
      results,
      summary: {
        totalSteps: results.length,
        successfulSteps,
        failedSteps: results.length - successfulSteps,
        totalDuration,
      },
    };
  }
}
