import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  checkProjectNameAvailability,
  getGithubDeployStatus,
  inferProjectType,
  listGithubOrgs,
  mergeAppEnvVars,
  orgConfigFromEnv,
  publishProjectApplication,
  readAppEnvVars,
  registerProjectApplication,
  resolveGithubOrg,
  runProjectBootstrap,
  runTerraformApplySecret,
  type ProjectBootstrapInput,
  type ProjectBootstrapResult,
  type EmitFn,
  type GithubOrgConfig,
  type ProjectNameAvailability,
} from 'boogiepop-bootstrap-core';
import { join } from 'path';
import { CreateProjectDto } from './dto/create-project.dto';
import { RegisterApplicationDto } from './dto/register-application.dto';
import { SetAppEnvDto } from './dto/set-app-env.dto';

@Injectable()
export class BootstrapService {
  constructor(private readonly config: ConfigService) {}

  private getGithubToken(): string {
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new ServiceUnavailableException('GITHUB_TOKEN no configurado');
    }
    return token;
  }

  private getOrgConfig(): GithubOrgConfig {
    return orgConfigFromEnv({
      boogiepop: this.config.get<string>('GITHUB_ORG_BOOGIEPOP'),
      remotes: this.config.get<string>('GITHUB_ORG_REMOTES'),
    });
  }

  async listOrgs() {
    return listGithubOrgs(this.getGithubToken());
  }

  getOrgTargets() {
    const orgs = this.getOrgConfig();
    return {
      boogiepop: orgs.boogiepop,
      remotes: orgs.remotes,
      rules: {
        next: resolveGithubOrg('next', orgs),
        streamlit: resolveGithubOrg('streamlit', orgs),
        vite: resolveGithubOrg('vite', orgs),
      },
      hint:
        'Personal: GITHUB_ORG_BOOGIEPOP=blanck1945 (next). Hub apps streamlit/vite: GITHUB_ORG_REMOTES=Boogiepop-remotes.',
    };
  }

  async runProjectBootstrap(
    dto: CreateProjectDto,
    emit: EmitFn,
  ): Promise<ProjectBootstrapResult> {
    const input: ProjectBootstrapInput = {
      name: dto.name,
      type: dto.type,
      visibility: dto.visibility,
      members: dto.members?.map((m) => ({
        identifier: m.identifier,
        role: m.role,
      })),
      provisionInfra: dto.provisionInfra,
    };

    const terraformDir = this.config.get<string>('INFRA_TERRAFORM_DIR')?.trim() || undefined;

    const availability = await this.checkProjectName({
      name: dto.name,
      type: dto.type,
      provisionInfra: dto.provisionInfra,
    });
    if (!availability.available) {
      const detail = availability.conflicts.map((c) => c.message).join(' · ');
      throw new Error(`Nombre no disponible: ${detail}`);
    }

    return runProjectBootstrap(input, {
      token: this.getGithubToken(),
      emit,
      orgConfig: this.getOrgConfig(),
      terraformDir,
      backendApiUrl: this.config.get<string>('BOOGIEPOP_API_URL')?.trim() || undefined,
      backendAdminEmail: this.config.get<string>('BOOGIEPOP_ADMIN_EMAIL')?.trim() || undefined,
      backendAdminPassword:
        this.config.get<string>('BOOGIEPOP_ADMIN_PASSWORD')?.trim() || undefined,
    });
  }

  async checkProjectName(opts: {
    name: string;
    type: CreateProjectDto['type'];
    provisionInfra?: boolean;
  }): Promise<ProjectNameAvailability> {
    const terraformDir = this.config.get<string>('INFRA_TERRAFORM_DIR')?.trim() || undefined;

    return checkProjectNameAvailability({
      name: opts.name,
      type: opts.type,
      provisionInfra: opts.provisionInfra,
      token: this.getGithubToken(),
      orgConfig: this.getOrgConfig(),
      terraformDir,
    });
  }

  private getBackendCredentials() {
    const apiUrl = this.config.get<string>('BOOGIEPOP_API_URL')?.trim();
    const adminEmail = this.config.get<string>('BOOGIEPOP_ADMIN_EMAIL')?.trim();
    const adminPassword = this.config.get<string>('BOOGIEPOP_ADMIN_PASSWORD')?.trim();
    if (!apiUrl || !adminEmail || !adminPassword) {
      throw new Error(
        'Backend no configurado: BOOGIEPOP_API_URL, BOOGIEPOP_ADMIN_EMAIL, BOOGIEPOP_ADMIN_PASSWORD',
      );
    }
    return { apiUrl, adminEmail, adminPassword };
  }

  private getTerraformDir(): string {
    const terraformDir = this.config.get<string>('INFRA_TERRAFORM_DIR')?.trim();
    if (!terraformDir) {
      throw new Error('INFRA_TERRAFORM_DIR no configurado en el Bootstrap MS');
    }
    return terraformDir;
  }

  async registerApplication(dto: RegisterApplicationDto) {
    const type = await inferProjectType({ name: dto.name, type: dto.type });
    return registerProjectApplication({
      name: dto.name,
      type,
      terraformDir: this.getTerraformDir(),
      orgConfig: this.getOrgConfig(),
      credentials: this.getBackendCredentials(),
    });
  }

  async setApplicationVisibility(opts: { name: string; hubVisible: boolean }) {
    return publishProjectApplication({
      name: opts.name,
      hubVisible: opts.hubVisible,
      credentials: this.getBackendCredentials(),
    });
  }

  async getDeployStatus(opts: { owner: string; repo: string; startedAfter: string }) {
    return getGithubDeployStatus({
      owner: opts.owner,
      repo: opts.repo,
      token: this.getGithubToken(),
      startedAfter: new Date(opts.startedAfter),
    });
  }

  async getApplicationEnv(name: string): Promise<Record<string, string>> {
    const tfDir = this.getTerraformDir();
    const tfName = name.replace(/-/g, '_');
    const tfvarsPath = join(tfDir, 'terraform.tfvars');
    return readAppEnvVars(tfvarsPath, tfName);
  }

  async setApplicationEnv(
    name: string,
    dto: SetAppEnvDto,
    emit: EmitFn,
  ): Promise<{ name: string; vars: string[]; applied: boolean }> {
    const tfDir = this.getTerraformDir();
    const tfName = name.replace(/-/g, '_');
    const tfvarsPath = join(tfDir, 'terraform.tfvars');

    emit('Actualizar terraform.tfvars', 'running', Object.keys(dto.vars).join(', '));
    const merged = await mergeAppEnvVars(tfvarsPath, tfName, dto.vars);
    emit('Actualizar terraform.tfvars', 'ok', `${Object.keys(merged).length} variable(s)`);

    emit('Terraform apply (secret + ECS)', 'running', 'actualizando Secrets Manager y reiniciando tarea');
    await runTerraformApplySecret({
      tfDir,
      tfName,
      onOutput: (line) => {
        if (line.includes('Apply complete') || line.includes('Modifying') || line.includes('Creating')) {
          emit('Terraform apply (secret + ECS)', 'running', line.slice(0, 120));
        }
      },
    });
    emit('Terraform apply (secret + ECS)', 'ok', 'Secrets Manager actualizado · ECS reiniciando');

    // persist updated tfvars back to Secrets Manager for future EFS reseeds
    emit('Sincronizar tfvars secret', 'running');
    try {
      const { execFileSync } = await import('child_process');
      const secretName = this.config.get<string>('BOOTSTRAP_TFVARS_SECRET')?.trim();
      if (secretName) {
        const tfvarsContent = (await readAppEnvVars(tfvarsPath, tfName)); // just a side effect read to confirm
        void tfvarsContent;
        const { readFile } = await import('fs/promises');
        const raw = await readFile(tfvarsPath, 'utf8');
        const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
        execFileSync('aws', [
          'secretsmanager', 'put-secret-value',
          '--secret-id', secretName,
          '--secret-string', raw,
          '--region', region,
        ]);
        emit('Sincronizar tfvars secret', 'ok');
      } else {
        emit('Sincronizar tfvars secret', 'warn', 'BOOTSTRAP_TFVARS_SECRET no configurado — omitido');
      }
    } catch {
      emit('Sincronizar tfvars secret', 'warn', 'No se pudo sincronizar el secret del tfvars');
    }

    return { name, vars: Object.keys(dto.vars), applied: true };
  }
}
