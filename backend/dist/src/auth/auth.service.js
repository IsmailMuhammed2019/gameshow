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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../user/user.service");
const crypto = require("crypto");
let AuthService = class AuthService {
    constructor(userService, jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }
    async validateUser(username, password) {
        try {
            const user = await this.userService.findByUsername(username);
            if (user && await this.userService.validatePassword(password, user.password)) {
                const { password, ...result } = user;
                return {
                    ...result,
                    score: Number(result.score),
                };
            }
            return null;
        }
        catch (error) {
            console.error('Error validating user:', error);
            throw error;
        }
    }
    async login(loginDto) {
        try {
            const user = await this.validateUser(loginDto.username, loginDto.password);
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const payload = { username: user.username, sub: user.id, role: user.role };
            return {
                access_token: this.jwtService.sign(payload),
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    uniqueNumber: user.uniqueNumber,
                    score: Number(user.score),
                },
            };
        }
        catch (error) {
            console.error('Error during login:', error);
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('Login error details:', { message: errorMessage, stack: errorStack });
            throw new common_1.InternalServerErrorException({
                message: 'Internal server error during login',
                error: errorMessage,
            });
        }
    }
    async register(createUserDto) {
        const user = await this.userService.create(createUserDto);
        const { password, ...result } = user;
        return {
            ...result,
            score: Number(result.score),
        };
    }
    async forgotPassword(forgotPasswordDto) {
        try {
            const user = await this.userService.findByEmailOrUsername(forgotPasswordDto.emailOrUsername);
            if (!user) {
                return {
                    message: 'If an account with that email or username exists, a password reset token has been sent.'
                };
            }
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date();
            resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);
            await this.userService.setResetPasswordToken(user.id, resetToken, resetTokenExpiry);
            console.log(`Password reset token for ${user.email}: ${resetToken}`);
            return {
                message: 'If an account with that email or username exists, a password reset token has been sent.',
                resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
            };
        }
        catch (error) {
            console.error('Error in forgotPassword:', error);
            throw new common_1.InternalServerErrorException('Error processing password reset request');
        }
    }
    async resetPassword(resetPasswordDto) {
        try {
            const user = await this.userService.findByResetToken(resetPasswordDto.token);
            if (!user) {
                throw new common_1.BadRequestException('Invalid or expired reset token');
            }
            await this.userService.resetPassword(user.id, resetPasswordDto.newPassword);
            return {
                message: 'Password has been reset successfully',
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            console.error('Error in resetPassword:', error);
            throw new common_1.InternalServerErrorException('Error resetting password');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map