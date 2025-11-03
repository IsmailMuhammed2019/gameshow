import { Injectable, UnauthorizedException, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findByUsername(username);
      if (user && await this.userService.validatePassword(password, user.password)) {
        const { password, ...result } = user;
        return {
          ...result,
          score: Number(result.score), // Convert BigInt to number
        };
      }
      return null;
    } catch (error) {
      console.error('Error validating user:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.username, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
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
          score: Number(user.score), // Convert BigInt to number
        },
      };
    } catch (error) {
      console.error('Error during login:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log full error details for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Login error details:', { message: errorMessage, stack: errorStack });
      throw new InternalServerErrorException({
        message: 'Internal server error during login',
        error: errorMessage,
      });
    }
  }

  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    const { password, ...result } = user;
    return {
      ...result,
      score: Number(result.score), // Convert BigInt to number
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const user = await this.userService.findByEmailOrUsername(forgotPasswordDto.emailOrUsername);
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return { 
          message: 'If an account with that email or username exists, a password reset token has been sent.' 
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

      // Save token to database
      await this.userService.setResetPasswordToken(user.id, resetToken, resetTokenExpiry);

      // In a real application, you would send an email here with the reset token
      // For now, we'll return the token (in production, remove this and send via email)
      console.log(`Password reset token for ${user.email}: ${resetToken}`);
      
      return {
        message: 'If an account with that email or username exists, a password reset token has been sent.',
        // In development, return the token. Remove this in production!
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      };
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      throw new InternalServerErrorException('Error processing password reset request');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      // Find user by reset token
      const user = await this.userService.findByResetToken(resetPasswordDto.token);
      
      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Reset the password
      await this.userService.resetPassword(user.id, resetPasswordDto.newPassword);

      return {
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error in resetPassword:', error);
      throw new InternalServerErrorException('Error resetting password');
    }
  }
}
