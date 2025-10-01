import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';

@Injectable()
export class EpisodeService {
  constructor(private prisma: PrismaService) {}

  async create(createEpisodeDto: CreateEpisodeDto) {
    return this.prisma.episode.create({
      data: createEpisodeDto,
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async findAll() {
    return this.prisma.episode.findMany({
      where: { isActive: true },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            questions: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.episode.findUnique({
      where: { id },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async update(id: string, updateEpisodeDto: UpdateEpisodeDto) {
    return this.prisma.episode.update({
      where: { id },
      data: updateEpisodeDto,
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async remove(id: string) {
    return this.prisma.episode.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async getPublishedEpisodes() {
    return this.prisma.episode.findMany({
      where: { 
        isActive: true,
        status: 'PUBLISHED'
      },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            questions: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getEpisodeQuestions(episodeId: string, targetRole?: string) {
    const whereClause: any = {
      episodeId,
      isActive: true
    };

    if (targetRole) {
      whereClause.targetRole = targetRole;
    }

    return this.prisma.question.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });
  }
}
