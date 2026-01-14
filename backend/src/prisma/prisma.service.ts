import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds

  constructor() {
    super({
      log: ['error', 'warn'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Handle connection errors
    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma database error:', e);
      this.isConnected = false;
      this.attemptReconnect();
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async connectWithRetry(): Promise<void> {
    const initialDelay = 5000; // Reset delay for new connection attempt
    this.reconnectDelay = initialDelay;
    
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        this.logger.log(`Attempting to connect to database... (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        await this.$connect();
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset on success
        this.reconnectDelay = initialDelay; // Reset delay
        this.logger.log('✅ Database connected successfully');
        return;
      } catch (error) {
        this.reconnectAttempts++;
        this.isConnected = false;
        this.logger.error(`❌ Failed to connect to database (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.logger.log(`Retrying connection in ${this.reconnectDelay / 1000} seconds...`);
          await this.sleep(this.reconnectDelay);
          // Exponential backoff
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000); // Max 30 seconds
        } else {
          this.logger.error('Max reconnection attempts reached. Please check your database connection.');
          // Reset for next attempt cycle
          this.reconnectAttempts = 0;
          this.reconnectDelay = initialDelay;
          throw error;
        }
      }
    }
  }

  async attemptReconnect(): Promise<void> {
    if (!this.isConnected) {
      this.logger.log('Connection lost. Attempting to reconnect to database...');
      // Reset attempts for new reconnection cycle
      this.reconnectAttempts = 0;
      await this.connectWithRetry();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  async isDatabaseConnected(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }
}
