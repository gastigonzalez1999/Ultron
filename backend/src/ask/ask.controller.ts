import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AskService, TestStep, FlowSuggestion, DebugAnalysis, DebugPrediction, DebugFix, ExecutionResult } from './ask.service';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post('chat')
  async processPrompt(@Body() body: { prompt: string }) {
    return await this.askService.processPrompt(body.prompt);
  }

  @Post('suggest-improvements')
  async suggestFlowImprovements(@Body() body: { flow: TestStep[] }) {
    const suggestions = await this.askService.suggestFlowImprovements(body.flow);
    return { suggestions };
  }

  @Post('execute-natural-language')
  async executeFlowWithNaturalLanguage(
    @Body() body: { flow: TestStep[]; instruction: string }
  ) {
    const result = await this.askService.executeFlowWithNaturalLanguage(
      body.flow,
      body.instruction
    );
    return result;
  }

  // AI-powered debugging endpoints
  @Post('analyze-failure')
  async analyzeFlowFailure(
    @Body() body: { executionResults: ExecutionResult[]; flow: TestStep[] }
  ) {
    const analysis = await this.askService.analyzeFlowFailure(
      body.executionResults,
      body.flow
    );
    return { analysis };
  }

  @Post('predict-issues')
  async predictFlowIssues(@Body() body: { flow: TestStep[] }) {
    const predictions = await this.askService.predictFlowIssues(body.flow);
    return { predictions };
  }

  @Post('suggest-debugging-steps')
  async suggestDebuggingSteps(
    @Body() body: { error: string; context: any }
  ) {
    const steps = await this.askService.suggestDebuggingSteps(
      body.error,
      body.context
    );
    return { steps };
  }
}
