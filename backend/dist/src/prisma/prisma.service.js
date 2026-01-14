"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
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
        this.logger = new common_1.Logger(PrismaService_1.name);
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;
        this.$on('error', (e) => {
            this.logger.error('Prisma database error:', e);
            this.isConnected = false;
            this.attemptReconnect();
        });
    }
    async onModuleInit() {
        await this.connectWithRetry();
    }
    async connectWithRetry() {
        const initialDelay = 5000;
        this.reconnectDelay = initialDelay;
        while (this.reconnectAttempts < this.maxReconnectAttempts) {
            try {
                this.logger.log(`Attempting to connect to database... (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
                await this.$connect();
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = initialDelay;
                this.logger.log('✅ Database connected successfully');
                return;
            }
            catch (error) {
                this.reconnectAttempts++;
                this.isConnected = false;
                this.logger.error(`❌ Failed to connect to database (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error);
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.logger.log(`Retrying connection in ${this.reconnectDelay / 1000} seconds...`);
                    await this.sleep(this.reconnectDelay);
                    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
                }
                else {
                    this.logger.error('Max reconnection attempts reached. Please check your database connection.');
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = initialDelay;
                    throw error;
                }
            }
        }
    }
    async attemptReconnect() {
        if (!this.isConnected) {
            this.logger.log('Connection lost. Attempting to reconnect to database...');
            this.reconnectAttempts = 0;
            await this.connectWithRetry();
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.isConnected = false;
            this.logger.log('Database disconnected');
        }
        catch (error) {
            this.logger.error('Error disconnecting from database:', error);
        }
    }
    async isDatabaseConnected() {
        try {
            await this.$queryRaw `SELECT 1`;
            this.isConnected = true;
            return true;
        }
        catch (error) {
            this.isConnected = false;
            this.logger.error('Database health check failed:', error);
            return false;
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map