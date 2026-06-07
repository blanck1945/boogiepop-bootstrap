import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString } from 'class-validator';

export class DeployStatusQueryDto {
  @ApiProperty({ example: 'Boogiepop-remotes' })
  @IsString()
  owner!: string;

  @ApiProperty({ example: 'boogiepop-stock-market' })
  @IsString()
  repo!: string;

  @ApiProperty({ description: 'ISO timestamp del push a main' })
  @IsISO8601()
  startedAfter!: string;
}
