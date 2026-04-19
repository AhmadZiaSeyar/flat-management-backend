import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionName } from '../common/enums/permission.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Permissions(PermissionName.CreateUser)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Permissions(PermissionName.ViewUser)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Permissions(PermissionName.AssignRole)
  @Get('roles')
  listRoles() {
    return this.usersService.listRoles();
  }

  @Permissions(PermissionName.AssignRole)
  @Patch(':id/role')
  updateRoles(@Param('id') id: string, @Body() updateUserRolesDto: UpdateUserRolesDto) {
    return this.usersService.updateRoles(id, updateUserRolesDto);
  }

  @Permissions(PermissionName.AssignRole)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() updateUserStatusDto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, updateUserStatusDto);
  }
}
