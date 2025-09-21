import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
type UserWithNumberScore = Omit<User, 'score'> & {
    score: number;
};
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<UserWithNumberScore>;
    findAll(): Promise<Partial<UserWithNumberScore>[]>;
    findOne(id: string): Promise<Partial<UserWithNumberScore>>;
    findByUsername(username: string): Promise<UserWithNumberScore | null>;
    findByUniqueNumber(uniqueNumber: string): Promise<UserWithNumberScore | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<UserWithNumberScore>;
    remove(id: string): Promise<void>;
    validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    private generateUniqueNumber;
}
export {};
