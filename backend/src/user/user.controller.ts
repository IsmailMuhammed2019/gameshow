import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    if (updateUserDto.password && req.user.role !== 'GENERAL_ADMIN') {
      throw new ForbiddenException('Only general admin can change passwords');
    }
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Patch(':id/reset-password')
  @UseGuards(JwtAuthGuard)
  resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }, @Request() req) {
    // Only general admin can reset passwords
    if (req.user.role !== 'GENERAL_ADMIN') {
      throw new ForbiddenException('Only general admin can reset passwords');
    }
    return this.userService.resetPassword(id, body.newPassword);
  }

  @Patch('me/switch-role')
  @UseGuards(JwtAuthGuard)
  switchRole(@Request() req, @Body() body: { newRole: string }) {
    // Only allow PARTICIPANT and AUDIENCE to switch roles
    const currentRole = req.user.role;
    const allowedRoles = ['PARTICIPANT', 'AUDIENCE'];

    if (!allowedRoles.includes(currentRole)) {
      throw new Error('Unauthorized: Only participants and audience members can switch roles');
    }

    if (!allowedRoles.includes(body.newRole)) {
      throw new Error('Invalid role: Can only switch between PARTICIPANT and AUDIENCE');
    }

    if (currentRole === body.newRole) {
      throw new Error('You are already in this role');
    }

    return this.userService.update(req.user.userId, { role: body.newRole as any });
  }
}
