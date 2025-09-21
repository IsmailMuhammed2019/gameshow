import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<User>;
    findAll(): Promise<Partial<User>[]>;
    findOne(id: string): Promise<Partial<User>>;
    findByUsername(username: string): Promise<User | null>;
    findByUniqueNumber(uniqueNumber: string): Promise<User | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<User>;
    remove(id: string): Promise<void>;
    validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    private generateUniqueNumber;
}
