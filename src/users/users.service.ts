import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PermissionName } from '../common/enums/permission.enum';
import { RoleName } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

const userListInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userListInclude }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    if (!createUserDto.username && !createUserDto.phone) {
      throw new BadRequestException('Provide a username or phone number.');
    }

    const roleNames = createUserDto.roleNames?.length
      ? createUserDto.roleNames
      : [RoleName.Member];
    const roles = await this.getRoles(roleNames);
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const pinHash = createUserDto.pin ? await bcrypt.hash(createUserDto.pin, 10) : null;

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            fullName: createUserDto.fullName,
            username: createUserDto.username,
            phone: createUserDto.phone,
            passwordHash,
            pinHash,
          },
        });

        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: createdUser.id,
            roleId: role.id,
          })),
          skipDuplicates: true,
        });

        return tx.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: userListInclude,
        });
      });

      return this.serializeUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with that username or phone already exists.');
      }

      throw error;
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userListInclude,
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
    });

    return users.map((user) => this.serializeUser(user));
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((item) => item.permission.key as PermissionName),
    }));
  }

  async updateRoles(userId: string, updateUserRolesDto: UpdateUserRolesDto) {
    await this.ensureUserExists(userId);
    const roles = await this.getRoles(updateUserRolesDto.roleNames);

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({ userId, roleId: role.id })),
        skipDuplicates: true,
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: userListInclude,
      });
    });

    return this.serializeUser(updatedUser);
  }

  async updateStatus(userId: string, updateUserStatusDto: UpdateUserStatusDto) {
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: updateUserStatusDto.isActive },
      include: userListInclude,
    });

    return this.serializeUser(user);
  }

  private async getRoles(roleNames: RoleName[]) {
    const roles = await this.prisma.role.findMany({
      where: {
        name: {
          in: roleNames,
        },
      },
    });

    if (roles.length !== roleNames.length) {
      throw new BadRequestException('One or more roles are invalid.');
    }

    return roles;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private serializeUser(user: UserWithRoles) {
    const roles = user.userRoles.map((item) => item.role.name as RoleName);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((item) =>
          item.role.rolePermissions.map(
            (rolePermission) => rolePermission.permission.key as PermissionName,
          ),
        ),
      ),
    );

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles,
      permissions,
    };
  }
}
