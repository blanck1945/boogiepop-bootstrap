import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapService } from './bootstrap.service';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  controllers: [BootstrapController],
  providers: [BootstrapService, ApiKeyGuard],
})
export class BootstrapModule {}
