import { IsObject, IsOptional, IsBoolean } from 'class-validator';

export class SetAppEnvDto {
  @IsObject()
  vars!: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}
