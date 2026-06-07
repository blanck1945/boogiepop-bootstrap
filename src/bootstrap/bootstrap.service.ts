import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  checkProjectNameAvailability,
  getGithubDeployStatus,
  inferProjectType,
  listGithubOrgs,
  orgConfigFromEnv,
  publishProjectApplication,
  registerProjectApplication,
  resolveGithubOrg,
  runProjectBootstrap,
  type ProjectBootstrapInput,
  type ProjectBootstrapResult,
  type EmitFn,
  type GithubOrgConfig,
  type ProjectNameAvailability,
} from 'boogiepop-bootstrap-core';
import { CreateProjectDto } from './dto/create-project.dto';
import { RegisterApplicationDto } from './dto/register-application.dto';

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
}
