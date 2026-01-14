import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    constructor();
    onModuleInit(): Promise<void>;
    connectWithRetry(): Promise<void>;
    attemptReconnect(): Promise<void>;
    private sleep;
    onModuleDestroy(): Promise<void>;
    isDatabaseConnected(): Promise<boolean>;
}
