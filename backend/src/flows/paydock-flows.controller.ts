import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PaydockFlowsService, FlowTemplate } from './paydock-flows.service';

export class SubstituteVariablesDto {
  flowName: string;
  variables: Record<string, string>;
}

@Controller('flows')
export class PaydockFlowsController {
  constructor(private readonly paydockFlowsService: PaydockFlowsService) {}

  @Get()
  getAllFlows(): FlowTemplate[] {
    return this.paydockFlowsService.getFlowTemplates();
  }

  @Get('templates')
  getAllTemplates(): FlowTemplate[] {
    return this.paydockFlowsService.getFlowTemplates();
  }

  @Get('categories')
  getCategories(): string[] {
    return this.paydockFlowsService.getCategories();
  }

  @Get('category/:category')
  getFlowsByCategory(@Param('category') category: string): FlowTemplate[] {
    return this.paydockFlowsService.getFlowTemplatesByCategory(category);
  }

  @Get('template/:name')
  getFlowTemplate(@Param('name') name: string): FlowTemplate {
    const template = this.paydockFlowsService.getFlowTemplateByName(name);
    if (!template) {
      throw new HttpException(
        { error: 'Template not found', name },
        HttpStatus.NOT_FOUND
      );
    }
    return template;
  }

  @Post('substitute')
  substituteVariables(@Body() substituteDto: SubstituteVariablesDto): FlowTemplate {
    const flow = this.paydockFlowsService.getFlowTemplateByName(substituteDto.flowName);
    if (!flow) {
      throw new HttpException(
        { error: 'Template not found', name: substituteDto.flowName },
        HttpStatus.NOT_FOUND
      );
    }

    return this.paydockFlowsService.substituteVariables(flow, substituteDto.variables);
  }

  @Get('summary')
  getFlowSummary(): {
    totalFlows: number;
    categories: Array<{
      name: string;
      count: number;
      flows: string[];
    }>;
  } {
    const flows = this.paydockFlowsService.getFlowTemplates();
    const categories = this.paydockFlowsService.getCategories();

    const categorySummary = categories.map(category => {
      const categoryFlows = this.paydockFlowsService.getFlowTemplatesByCategory(category);
      return {
        name: category,
        count: categoryFlows.length,
        flows: categoryFlows.map(flow => flow.name)
      };
    });

    return {
      totalFlows: flows.length,
      categories: categorySummary
    };
  }
}
