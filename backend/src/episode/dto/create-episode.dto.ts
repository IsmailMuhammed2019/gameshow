import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { EpisodeStatus, UserRole } from '@prisma/client';

export class CreateEpisodeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EpisodeStatus)
  status?: EpisodeStatus;

  @IsEnum(UserRole)
  targetRole: UserRole; // PARTICIPANT or AUDIENCE

  @IsOptional()
  @IsBoolean()
  isForBothRoles?: boolean; // If true, episode works for both participants and audience
}
