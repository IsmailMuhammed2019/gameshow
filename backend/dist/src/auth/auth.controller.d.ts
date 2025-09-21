import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    getProfile(req: any): any;
}
