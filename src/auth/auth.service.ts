import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PermissionName } from '../common/enums/permission.enum';
import { RoleName } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const authUserInclude = {
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

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.findUserByIdentifier(loginDto.identifier);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid login details.');
    }

    const secretValue = loginDto.pin ?? loginDto.password;
    const hash = loginDto.pin ? user.pinHash : user.passwordHash;

    if (!secretValue || !hash) {
      throw new UnauthorizedException('Invalid login details.');
    }

    const isValid = await bcrypt.compare(secretValue, hash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid login details.');
    }

    const appUser = this.toAuthenticatedUser(user);
    const tokens = await this.issueTokens(appUser);

    await this.storeRefreshTokenHash(appUser.id, tokens.refreshToken);

    return {
      user: appUser,
      ...tokens,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: authUserInclude,
    });

    if (!user?.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const matches = await bcrypt.compare(refreshTokenDto.refreshToken, user.refreshTokenHash);

    if (!matches) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const appUser = this.toAuthenticatedUser(user);
    const tokens = await this.issueTokens(appUser);

    await this.storeRefreshTokenHash(appUser.id, tokens.refreshToken);

    return {
      user: appUser,
      ...tokens,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    return this.toAuthenticatedUser(user);
  }

  async validateAccessTokenUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });

    if (!user || !user.isActive) {
      return null;
    }

    return this.toAuthenticatedUser(user);
  }

  private async findUserByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { phone: identifier }],
      },
      include: authUserInclude,
    });
  }

  private async issueTokens(user: AuthenticatedUser) {
    const payload = {
      sub: user.id,
      identifier: user.username ?? user.phone ?? user.id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getAccessSecret(),
      expiresIn: this.getExpiryInSeconds('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: this.getExpiryInSeconds('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshTokenHash(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  private toAuthenticatedUser(user: UserWithRoles): AuthenticatedUser {
    const roles = user.userRoles.map((entry) => entry.role.name as RoleName);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((entry) =>
          entry.role.rolePermissions.map(
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
      roles,
      permissions,
    };
  }

  private getAccessSecret() {
    return this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
  }

  private getRefreshSecret() {
    return this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';
  }

  private getExpiryInSeconds(envKey: string, fallback: string) {
    const value = this.configService.get<string>(envKey) ?? fallback;

    return this.parseExpiryToSeconds(value) ?? this.parseExpiryToSeconds(fallback) ?? 900;
  }

  private parseExpiryToSeconds(value: string) {
    if (/^\d+$/.test(value)) {
      return Number(value);
    }

    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      return null;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === 's') {
      return amount;
    }

    if (unit === 'm') {
      return amount * 60;
    }

    if (unit === 'h') {
      return amount * 60 * 60;
    }

    return amount * 60 * 60 * 24;
  }
}
