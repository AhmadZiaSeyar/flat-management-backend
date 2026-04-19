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

const authUserBaseSelect = {
  id: true,
  fullName: true,
  username: true,
  phone: true,
  passwordHash: true,
  refreshTokenHash: true,
  isActive: true,
} satisfies Prisma.UserSelect;

const authUserBaseSelectWithEmail = {
  ...authUserBaseSelect,
  email: true,
} satisfies Prisma.UserSelect;

const authUserRolesInclude = {
  role: {
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  },
} satisfies Prisma.UserRoleInclude;

type AuthUserBase = {
  id: string;
  fullName: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  passwordHash: string;
  refreshTokenHash: string | null;
  isActive: boolean;
};

type UserRolesWithPermissions = Prisma.UserRoleGetPayload<{ include: typeof authUserRolesInclude }>;

@Injectable()
export class AuthService {
  private emailColumnAvailability: boolean | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.findUserByIdentifier(loginDto.identifier.trim());

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid login details.');
    }

    const passwordHash = user.passwordHash?.trim();

    if (!passwordHash) {
      throw new UnauthorizedException('Invalid login details.');
    }

    let isValid = false;

    try {
      isValid = await bcrypt.compare(loginDto.password, passwordHash);
    } catch {
      throw new UnauthorizedException('Invalid login details.');
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid login details.');
    }

    const appUser = await this.buildAuthenticatedUser(user);
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

    const user = await this.findUserById(payload.sub);

    if (!user?.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    let matches = false;

    try {
      matches = await bcrypt.compare(refreshTokenDto.refreshToken, user.refreshTokenHash);
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    if (!matches) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const appUser = await this.buildAuthenticatedUser(user);
    const tokens = await this.issueTokens(appUser);

    await this.storeRefreshTokenHash(appUser.id, tokens.refreshToken);

    return {
      user: appUser,
      ...tokens,
    };
  }

  async me(userId: string) {
    const user = await this.findUserById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    return this.buildAuthenticatedUser(user);
  }

  async validateAccessTokenUser(userId: string) {
    const user = await this.findUserById(userId);

    if (!user || !user.isActive) {
      return null;
    }

    return this.buildAuthenticatedUser(user);
  }

  private async findUserByIdentifier(identifier: string) {
    const normalizedIdentifier = identifier.trim();
    const hasEmailColumn = await this.hasEmailColumn();
    const isEmailIdentifier = normalizedIdentifier.includes('@');
    const conditions: Prisma.UserWhereInput[] = [
      { username: normalizedIdentifier },
      { phone: normalizedIdentifier },
    ];

    if (hasEmailColumn && isEmailIdentifier) {
      conditions.push({ email: normalizedIdentifier.toLowerCase() });
    }

    if (hasEmailColumn) {
      const user = await this.prisma.user.findFirst({
        where: { OR: conditions },
        select: authUserBaseSelectWithEmail,
      });

      return user;
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: conditions },
      select: authUserBaseSelect,
    });

    return user
      ? {
      ...user,
      email: null,
    }
      : null;
  }

  private async findUserById(userId: string) {
    const hasEmailColumn = await this.hasEmailColumn();

    if (hasEmailColumn) {
      return this.prisma.user.findUnique({
        where: { id: userId },
        select: authUserBaseSelectWithEmail,
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: authUserBaseSelect,
    });

    return user
      ? {
      ...user,
      email: null,
    }
      : null;
  }

  private async buildAuthenticatedUser(user: AuthUserBase) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: authUserRolesInclude,
    });

    return this.toAuthenticatedUser(user, userRoles);
  }

  private async issueTokens(user: AuthenticatedUser) {
    const payload = {
      sub: user.id,
      identifier: user.username ?? user.email ?? user.phone ?? user.id,
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

  private toAuthenticatedUser(
    user: AuthUserBase,
    userRoles: UserRolesWithPermissions[],
  ): AuthenticatedUser {
    const roles = userRoles.map((entry) => entry.role.name as RoleName);
    const permissions = Array.from(
      new Set(
        userRoles.flatMap((entry) =>
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
      email: user.email,
      isActive: user.isActive,
      roles,
      permissions,
    };
  }

  private async hasEmailColumn() {
    if (this.emailColumnAvailability !== null) {
      return this.emailColumnAvailability;
    }

    const result = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'email'
      ) AS "exists"
    `;

    this.emailColumnAvailability = result[0]?.exists ?? false;

    return this.emailColumnAvailability;
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
