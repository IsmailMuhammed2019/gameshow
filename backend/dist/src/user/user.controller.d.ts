import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(createUserDto: CreateUserDto): Promise<Omit<{
        id: string;
        username: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        uniqueNumber: string;
        isActive: boolean;
        score: bigint;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, "score"> & {
        score: number;
    }>;
    findAll(): Promise<Partial<Omit<{
        id: string;
        username: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        uniqueNumber: string;
        isActive: boolean;
        score: bigint;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, "score"> & {
        score: number;
    }>[]>;
    findOne(id: string): Promise<Partial<Omit<{
        id: string;
        username: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        uniqueNumber: string;
        isActive: boolean;
        score: bigint;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, "score"> & {
        score: number;
    }>>;
    update(id: string, updateUserDto: UpdateUserDto, req: any): Promise<Omit<{
        id: string;
        username: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        uniqueNumber: string;
        isActive: boolean;
        score: bigint;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, "score"> & {
        score: number;
    }>;
    remove(id: string): Promise<void>;
    resetPassword(id: string, body: {
        newPassword: string;
    }, req: any): Promise<{
        message: string;
    }>;
    switchRole(req: any, body: {
        newRole: string;
    }): Promise<Omit<{
        id: string;
        username: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        uniqueNumber: string;
        isActive: boolean;
        score: bigint;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, "score"> & {
        score: number;
    }>;
}
