import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { EpisodeService } from './episode.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('episodes')
@UseGuards(JwtAuthGuard)
export class EpisodeController {
  constructor(private readonly episodeService: EpisodeService) {}

  @Post()
  create(@Body() createEpisodeDto: CreateEpisodeDto, @Request() req) {
    // Only general admin can create episodes
    if (req.user.role !== 'GENERAL_ADMIN') {
      throw new Error('Unauthorized: Only general admin can create episodes');
    }
    return this.episodeService.create(createEpisodeDto);
  }

  @Get()
  findAll(@Request() req, @Query('targetRole') targetRole?: string) {
    // General admin can see all episodes
    if (req.user.role === 'GENERAL_ADMIN') {
      return this.episodeService.findAll();
    }
    // Game master can see published episodes, optionally filtered by targetRole
    return this.episodeService.getPublishedEpisodes(targetRole);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.episodeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEpisodeDto: UpdateEpisodeDto, @Request() req) {
    // Only general admin can update episodes
    if (req.user.role !== 'GENERAL_ADMIN') {
      throw new Error('Unauthorized: Only general admin can update episodes');
    }
    return this.episodeService.update(id, updateEpisodeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    // Only general admin can delete episodes
    if (req.user.role !== 'GENERAL_ADMIN') {
      throw new Error('Unauthorized: Only general admin can delete episodes');
    }

    // Validate ID parameter
    if (!id || id.trim() === '') {
      throw new Error('Episode ID parameter is required');
    }

    console.log(`[DELETE] Attempting to delete episode with ID: ${id}`);

    try {
      const result = await this.episodeService.remove(id);
      console.log(`[DELETE] Successfully deleted episode with ID: ${id}`);
      return result;
    } catch (error) {
      console.error(`[DELETE] Error deleting episode ${id}:`, error);
      throw error;
    }
  }

  @Get(':id/questions')
  getEpisodeQuestions(@Param('id') id: string, @Request() req) {
    return this.episodeService.getEpisodeQuestions(id);
  }
}
