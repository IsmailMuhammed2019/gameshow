import { Injectable, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from '@prisma/client';

// Custom type with score as number instead of bigint
type UserWithNumberScore = Omit<User, 'score'> & { score: number };

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserWithNumberScore> {
    // Check if username or email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Generate unique number
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
      score: Number(user.score), // Convert BigInt to number
    };
  }

  async findAll(): Promise<Partial<UserWithNumberScore>[]> {
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
    
    // Convert BigInt scores to numbers
    return users.map(user => ({
      ...user,
      score: Number(user.score),
    }));
  }

  async findOne(id: string): Promise<Partial<UserWithNumberScore>> {
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
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      score: Number(user.score), // Convert BigInt to number
    };
  }

  async findByUsername(username: string): Promise<UserWithNumberScore | null> {
    try {
      const user = await this.prisma.user.findUnique({ where: { username } });
      if (user) {
        return {
          ...user,
          score: Number(user.score), // Convert BigInt to number
        };
      }
      return null;
    } catch (error) {
      console.error('Database error in findByUsername:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      throw new InternalServerErrorException({
        message: 'Database connection error',
        error: errorMessage,
      });
    }
  }

  async findByUniqueNumber(uniqueNumber: string): Promise<UserWithNumberScore | null> {
    const user = await this.prisma.user.findUnique({ where: { uniqueNumber } });
    if (user) {
      return {
        ...user,
        score: Number(user.score), // Convert BigInt to number
      };
    }
    return null;
  }

  async findByEmail(email: string): Promise<UserWithNumberScore | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      return {
        ...user,
        score: Number(user.score), // Convert BigInt to number
      };
    }
    return null;
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<UserWithNumberScore | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
    });
    if (user) {
      return {
        ...user,
        score: Number(user.score), // Convert BigInt to number
      };
    }
    return null;
  }

  async setResetPasswordToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt,
      },
    });
  }

  async findByResetToken(token: string): Promise<UserWithNumberScore | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });
    if (user) {
      return {
        ...user,
        score: Number(user.score), // Convert BigInt to number
      };
    }
    return null;
  }

  async clearResetPasswordToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserWithNumberScore> {
    await this.findOne(id);
    
    const updateData: any = { ...updateUserDto };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updatedUser,
      score: Number(updatedUser.score), // Convert BigInt to number
    };
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Check if user exists
    await this.prisma.user.delete({ where: { id } });
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async resetPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    // Check if user exists
    await this.findOne(userId);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password and clear reset token
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }
    });
    
    return { message: 'Password reset successfully' };
  }

  private generateUniqueNumber(): string {
    // Generate a 6-digit unique number
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
