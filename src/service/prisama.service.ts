// src/prisma/prisma.service.ts

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleDestroy {
    private readonly prisma = new PrismaClient();

    constructor() { }

    get user() {
        return this.prisma.user;
    }

    get message() {
        return this.prisma.message;
    }

    // get Message() { 
    //     return this.prisma.message;
    // }


    // Add implementation here
    async onModuleDestroy() {
        await this.prisma.$disconnect();

    }
}
