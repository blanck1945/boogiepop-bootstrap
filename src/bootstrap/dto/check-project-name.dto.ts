import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ProjectTypeDto } from './create-project.dto';

export class CheckProjectNameDto {
  @ApiProperty({ example: 'my-app' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ProjectTypeDto })
  @IsEnum(ProjectTypeDto)
  type!: ProjectTypeDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true;
    if (value === 'false' || value === false) return false;
    return true;
  })
  @IsBoolean()
  provisionInfra?: boolean;
}
