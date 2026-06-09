import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ApiKeyGuard } from './api-key.guard';
import { BootstrapService } from './bootstrap.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CheckProjectNameDto } from './dto/check-project-name.dto';
import { DeployStatusQueryDto } from './dto/deploy-status.dto';
import {
  ApplicationVisibilityDto,
  RegisterApplicationDto,
} from './dto/register-application.dto';
import { SetAppEnvDto } from './dto/set-app-env.dto';

@ApiTags('bootstrap')
@ApiBearerAuth('BootstrapApiKey')
@UseGuards(ApiKeyGuard)
@Controller('bootstrap')
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Get('meta/orgs')
  @ApiOperation({ summary: 'Lista orgs GitHub accesibles con el token del servicio' })
  listOrgs() {
    return this.bootstrapService.listOrgs();
  }

  @Get('meta/targets')
  @ApiOperation({
    summary: 'Org destino por tipo de proyecto',
    description: 'next → boogiepop; streamlit/vite (hub apps) → remotes',
  })
  targets() {
    return this.bootstrapService.getOrgTargets();
  }

  @Get('projects/availability')
  @ApiOperation({
    summary: 'Comprueba si el nombre del proyecto está libre (repo + infra)',
  })
  checkAvailability(@Query() query: CheckProjectNameDto) {
    return this.bootstrapService.checkProjectName({
      name: query.name,
      type: query.type,
      provisionInfra: query.provisionInfra,
    });
  }

  @Get('projects/deploy-status')
  @ApiOperation({ summary: 'Estado del workflow deploy.yml tras push a main' })
  getDeployStatus(@Query() query: DeployStatusQueryDto) {
    return this.bootstrapService.getDeployStatus({
      owner: query.owner,
      repo: query.repo,
      startedAfter: query.startedAfter,
    });
  }

  @Post('projects')
  @ApiOperation({ summary: 'Crea proyecto desde seed (respuesta SSE)' })
  @ApiProduces('text/event-stream')
  async createProject(
    @Body() dto: CreateProjectDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (event: string, data: object) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const emit = (step: string, status: 'running' | 'ok' | 'error' | 'warn', detail?: string) => {
      send('step', { step, status, detail });
    };

    try {
      const result = await this.bootstrapService.runProjectBootstrap(dto, emit);
      send('done', result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      send('error', { message });
    } finally {
      res.end();
    }
  }

  @Post('applications/register')
  @ApiOperation({
    summary: 'Registrar app en backend DB (pública, oculta en hub)',
  })
  registerApplication(@Body() dto: RegisterApplicationDto) {
    return this.bootstrapService.registerApplication(dto);
  }

  @Patch('applications/publish')
  @ApiOperation({ summary: 'Mostrar app en el hub (hubVisible=true)' })
  publishApplication(@Body() dto: ApplicationVisibilityDto) {
    return this.bootstrapService.setApplicationVisibility({
      name: dto.name,
      hubVisible: true,
    });
  }

  @Patch('applications/hide')
  @ApiOperation({ summary: 'Ocultar app del hub (hubVisible=false)' })
  hideApplication(@Body() dto: ApplicationVisibilityDto) {
    return this.bootstrapService.setApplicationVisibility({
      name: dto.name,
      hubVisible: false,
    });
  }

  @Patch('applications/:name/env')
  @ApiOperation({ summary: 'Agregar/actualizar variables de entorno (Secrets Manager + apply + restart)' })
  @ApiProduces('text/event-stream')
  async setApplicationEnv(
    @Param('name') name: string,
    @Body() dto: SetAppEnvDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (event: string, data: object) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const emit = (step: string, status: 'running' | 'ok' | 'error' | 'warn', detail?: string) => {
      send('step', { step, status, detail });
    };

    try {
      const result = await this.bootstrapService.setApplicationEnv(name, dto, emit);
      send('done', result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      send('error', { message });
    } finally {
      res.end();
    }
  }
}
