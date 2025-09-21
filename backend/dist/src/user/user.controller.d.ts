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
        uniqueNumber: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        score: bigint;
        createdAt: Date;
        updatedAt: Date;
    }, "score"> & {
        score: number;
    }>;
    findAll(): Promise<Partial<Omit<{
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
    }, "score"> & {
        score: number;
    }>[]>;
    findOne(id: string): Promise<Partial<Omit<{
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
    }, "score"> & {
        score: number;
    }>>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<{
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
    }, "score"> & {
        score: number;
    }>;
    remove(id: string): Promise<void>;
}
