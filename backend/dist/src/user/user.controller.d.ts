import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(createUserDto: CreateUserDto): Promise<{
        id: string;
        username: string;
        email: string;
        uniqueNumber: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        score: bigint;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<Partial<{
        id: string;
        username: string;
        email: string;
        uniqueNumber: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        score: bigint;
        createdAt: Date;
        updatedAt: Date;
    }>[]>;
    findOne(id: string): Promise<Partial<{
        id: string;
        username: string;
        email: string;
        uniqueNumber: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        score: bigint;
        createdAt: Date;
        updatedAt: Date;
    }>>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        username: string;
        email: string;
        uniqueNumber: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        score: bigint;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<void>;
}
