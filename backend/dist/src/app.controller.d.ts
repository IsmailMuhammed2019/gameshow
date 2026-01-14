import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
export declare class AppController {
    private readonly appService;
    private readonly prisma;
    constructor(appService: AppService, prisma: PrismaService);
    getHello(): string;
    getHealth(): {
        status: string;
        timestamp: string;
        service: string;
        version: string;
        environment: string;
        uptime: number;
    };
    getReadiness(): Promise<{
        status: string;
        timestamp: string;
        checks: {
            database: string;
            api: string;
        };
        error?: undefined;
    } | {
        status: string;
        timestamp: string;
        checks: {
            database: string;
            api: string;
        };
        error: string;
    }>;
    getLiveness(): {
        status: string;
        timestamp: string;
    };
}
