import { Controller, Post, Get, Patch, Body, Param, Req, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';

// Mock guards
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Mock: assume token is valid and set user
    request.user = { id: 'mock-user-id', role: 'admin' }; // mock
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const handler = context.getHandler();
    if (handler.name === 'updateUser') {
      return user.role === 'admin';
    }
    return ['admin', 'trader', 'viewer'].includes(user.role);
  }
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() body: { email: string; abn: string; orgName: string }) {
    try {
      return await this.userService.register(body.email, body.abn, body.orgName);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getMe(@Req() req) {
    const user = await this.userService.findUser(req.user.id);
    if (!user) throw new NotFoundException();
    return {
      id: user.id,
      email: this.userService.maskEmail(this.userService.decryptData(user.email)),
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        abn: this.userService.maskAbn(this.userService.decryptData(user.organization.abn)),
      },
      kycStatus: user.kycStatus,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateUser(@Param('id') id: string, @Body() updates: Partial<Pick<User, 'kycStatus' | 'role'>>, @Req() req) {
    if (req.user.role !== 'admin') throw new BadRequestException('Insufficient permissions');
    return await this.userService.updateUser(id, updates);
  }
}