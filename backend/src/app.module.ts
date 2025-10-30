import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AskController } from './ask/ask.controller';
import { AskService } from './ask/ask.service';
import { ExecutionController } from './execution/execution.controller';
import { ExecutionService } from './execution/execution.service';
import { EnvironmentConfig } from './config/environment.config';
import { EnvironmentController } from './config/environment.controller';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { SchemaBuilderService } from './tools/schema-builder.service';
import { SchemaBuilderController } from './tools/schema-builder.controller';
import { PaydockFlowsService } from './flows/paydock-flows.service';
import { PaydockFlowsController } from './flows/paydock-flows.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, AskController, ExecutionController, EnvironmentController, AuthController, SchemaBuilderController, PaydockFlowsController],
  providers: [AppService, AskService, ExecutionService, EnvironmentConfig, AuthService, SchemaBuilderService, PaydockFlowsService],
})
export class AppModule {}
