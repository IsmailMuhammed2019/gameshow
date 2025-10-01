import { IsString, IsOptional, IsEnum } from 'class-validator';
import { EpisodeStatus } from '@prisma/client';

export class CreateEpisodeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EpisodeStatus)
  status?: EpisodeStatus;
}
