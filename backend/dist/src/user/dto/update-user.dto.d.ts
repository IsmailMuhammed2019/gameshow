import { UserRole } from '@prisma/client';
export declare class UpdateUserDto {
    username?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    uniqueNumber?: string;
    isActive?: boolean;
    score?: number;
}
