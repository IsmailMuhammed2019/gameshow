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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
let UserService = class UserService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createUserDto) {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: createUserDto.username },
                    { email: createUserDto.email },
                ],
            },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Username or email already exists');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const uniqueNumber = this.generateUniqueNumber();
        const user = await this.prisma.user.create({
            data: {
                ...createUserDto,
                password: hashedPassword,
                uniqueNumber,
            },
        });
        return {
            ...user,
            score: Number(user.score),
        };
    }
    async findAll() {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                uniqueNumber: true,
                isActive: true,
                score: true,
                createdAt: true,
            },
        });
        return users.map(user => ({
            ...user,
            score: Number(user.score),
        }));
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                uniqueNumber: true,
                isActive: true,
                score: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            ...user,
            score: Number(user.score),
        };
    }
    async findByUsername(username) {
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (user) {
            return {
                ...user,
                score: Number(user.score),
            };
        }
        return null;
    }
    async findByUniqueNumber(uniqueNumber) {
        const user = await this.prisma.user.findUnique({ where: { uniqueNumber } });
        if (user) {
            return {
                ...user,
                score: Number(user.score),
            };
        }
        return null;
    }
    async update(id, updateUserDto) {
        await this.findOne(id);
        const updateData = { ...updateUserDto };
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: updateData,
        });
        return {
            ...updatedUser,
            score: Number(updatedUser.score),
        };
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.user.delete({ where: { id } });
    }
    async validatePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
    generateUniqueNumber() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);
//# sourceMappingURL=user.service.js.map