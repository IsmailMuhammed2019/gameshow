import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
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
        error: any;
    }>;
    getLiveness(): {
        status: string;
        timestamp: string;
    };
}
