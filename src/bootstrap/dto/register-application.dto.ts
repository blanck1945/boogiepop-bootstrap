import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const PROJECT_TYPES = ['next', 'vite', 'streamlit'] as const;

export class RegisterApplicationDto {
  @ApiProperty({ example: 'argentina-temperature' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: PROJECT_TYPES })
  @IsOptional()
  @IsIn(PROJECT_TYPES)
  type?: (typeof PROJECT_TYPES)[number];
}

export class ApplicationVisibilityDto {
  @ApiProperty({ example: 'argentina-temperature' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
