import { LoginUserDto } from './dto/login-user.dto';
// user.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'src/service/prisama.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class UserService {

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async signup(createUserDto: CreateUserDto): Promise<{ user: User, token: string } | string> {
        try {
            console.log('createUserDto', createUserDto);
            const existingUser = await this.prisma.user.findUnique({
                where: { email: createUserDto.email },
            });

            console.log('existingUser', existingUser);
            if (existingUser) {
                throw new HttpException('User already exists', HttpStatus.CONFLICT);
            }

            const user = await this.prisma.user.create({
                data: {
                    name: createUserDto.name,
                    email: createUserDto.email,
                    password: createUserDto.password,
                },
            });

            const token = this.generateToken(user);

            return { user, token };

        } catch (error) {
            const errorMessage = error.message.trim();
            throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        }
    }

    async login(loginUserDto: LoginUserDto): Promise<{ user: User, token: string } | null> {
        console.log("eeeeeeeeeeee" + loginUserDto.email)
        const user = await this.prisma.user.findUnique({
            where: { email: loginUserDto.email },
        });

        if (!user || user.password !== loginUserDto.password) {
            throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
        }

        const token = this.generateToken(user);

        return { user, token };
    }

    private generateToken(user: User): string {
        const payload = { userId: user.id };
        return this.jwtService.sign(payload);
    }

    validateUser(payload: any) {
        return this.prisma.user.findUnique({
            where: { id: payload.userId },
        });

    }
}
