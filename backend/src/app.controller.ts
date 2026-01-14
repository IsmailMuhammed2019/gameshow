import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'millionaire-game-backend',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };
  }

  @Get('health/ready')
  async getReadiness() {
    // Check if the application is ready to handle requests
    try {
      // Test database connection using PrismaService
      const isConnected = await this.prisma.isDatabaseConnected();
      
      if (!isConnected) {
        // Try to reconnect
        await this.prisma.connectWithRetry();
      }
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: isConnected ? 'ok' : 'reconnecting',
          api: 'ok',
        },
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'error',
          api: 'ok',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('health/live')
  getLiveness() {
    // Check if the application is alive
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
