// user.controller.ts
import { Body, Controller, HttpException, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/guards/auth.guard';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post('signup')
    async createUser(@Body() createUserDto: CreateUserDto): Promise<any> {
        try {
            return await this.userService.signup(createUserDto);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }
    @Post('login')
    async login(@Body() loginUserDto: LoginUserDto): Promise<any> {
        try {
            console.log('loginUserDto', loginUserDto)
            return await this.userService.login(loginUserDto);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }


    @UseGuards(JwtAuthGuard)
    @Post('protected')
    async protectedRoute(@Request() req: any) {
        console.log('req', req.user);

        return 'This is a protected route';

    }

    // @Post('login')
    // async login() {
    //     return await this.userService.login();
    // }
}
