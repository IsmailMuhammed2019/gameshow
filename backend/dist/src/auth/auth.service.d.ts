import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
export declare class AuthService {
    private userService;
    private jwtService;
    constructor(userService: UserService, jwtService: JwtService);
    validateUser(username: string, password: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            username: any;
            email: any;
            role: any;
            uniqueNumber: any;
        };
    }>;
    register(createUserDto: CreateUserDto): Promise<{
        id: string;
        username: string;
        email: string;
        uniqueNumber: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        score: bigint;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
