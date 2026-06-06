import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectTypeDto {
  next = 'next',
  vite = 'vite',
  streamlit = 'streamlit',
}

export enum GitHubPermissionDto {
  admin = 'admin',
  write = 'write',
  read = 'read',
}

export class ProjectMemberDto {
  @ApiProperty({ example: 'blanck1945', description: 'Username de GitHub (sin @)' })
  @IsString()
  @MinLength(1)
  identifier!: string;

  @ApiProperty({ enum: GitHubPermissionDto, default: GitHubPermissionDto.write })
  @IsEnum(GitHubPermissionDto)
  role!: GitHubPermissionDto;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'my-app' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ProjectTypeDto })
  @IsEnum(ProjectTypeDto)
  type!: ProjectTypeDto;

  @ApiPropertyOptional({ enum: ['public', 'private'], default: 'public' })
  @IsOptional()
  @IsEnum(['public', 'private'])
  visibility?: 'public' | 'private';

  @ApiPropertyOptional({ type: [ProjectMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberDto)
  members?: ProjectMemberDto[];

  @ApiPropertyOptional({
    default: true,
    description:
      'Generar Terraform y aplicar infra AWS (ECR, ECS, ALB, S3, Secrets Manager) antes del push al repo',
  })
  @IsOptional()
  @IsBoolean()
  provisionInfra?: boolean;
}
