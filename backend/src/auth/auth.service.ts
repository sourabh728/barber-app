import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

import { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import {
  DEFAULT_SHOP_DESCRIPTION,
  RegisterBarberDto,
} from './dto/register-barber.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, phone, password, role } = registerDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole =
      role === UserRole.BARBER ? UserRole.BARBER : UserRole.CUSTOMER;

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: assignedRole,
      },
      select: publicUserSelect,
    });

    return user;
  }

  async registerBarber(registerBarberDto: RegisterBarberDto) {
    const {
      name,
      email,
      phone,
      password,
      address,
      city,
      state,
      pincode,
      description,
    } = registerBarberDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const shopDescription =
      description?.trim() || DEFAULT_SHOP_DESCRIPTION;

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: UserRole.BARBER,
        shops: {
          create: {
            name,
            description: shopDescription,
            phone,
            email,
            address,
            city,
            state,
            pincode,
          },
        },
      },
      select: {
        ...publicUserSelect,
        shops: {
          select: {
            id: true,
            name: true,
            description: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const { shops, ...publicUser } = user;
    const shop = shops[0];

    return {
      ...publicUser,
      shop,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueAuthResponse(user);
  }

  async loginWithGoogle(googleLoginDto: GoogleLoginDto) {
    const audiences = this.getGoogleAudiences();

    if (audiences.length === 0) {
      throw new ServiceUnavailableException(
        'Google Sign-In is not configured on the server.',
      );
    }

    let payload:
      | { email?: string; email_verified?: boolean | string; name?: string }
      | undefined;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleLoginDto.idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch (error) {
      const details = error instanceof Error ? error.message : '';
      this.logger.warn(
        `Google ID token verification failed${details ? `: ${details}` : ''}`,
      );

      if (/audience|recipient/i.test(details)) {
        throw new UnauthorizedException(
          'Google token was issued for a different client ID.',
        );
      }

      throw new UnauthorizedException(
        'Google could not verify this sign-in. Please try again.',
      );
    }

    const email = payload?.email;
    const emailVerified =
      payload?.email_verified === true || payload?.email_verified === 'true';

    if (!email || !emailVerified) {
      throw new UnauthorizedException('Google account email is not verified.');
    }

    const requestedRole =
      googleLoginDto.role === UserRole.BARBER
        ? UserRole.BARBER
        : UserRole.CUSTOMER;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: publicUserSelect,
    });

    if (existingUser) {
      if (
        existingUser.role !== requestedRole &&
        existingUser.role !== UserRole.ADMIN
      ) {
        const updatedUser = await this.prisma.user.update({
          where: { email },
          data: { role: requestedRole },
          select: publicUserSelect,
        });

        return this.issueAuthResponse(updatedUser);
      }

      return this.issueAuthResponse(existingUser);
    }

    const hashedPassword = await bcrypt.hash(
      randomBytes(32).toString('hex'),
      10,
    );
    const name = payload?.name?.trim() || email.split('@')[0];

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: requestedRole,
      },
      select: publicUserSelect,
    });

    return this.issueAuthResponse(user);
  }

  private getGoogleAudiences(): string[] {
    const combined = this.configService.get<string>('GOOGLE_CLIENT_IDS') ?? '';
    const individual = [
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
    ];

    return [...combined.split(','), ...individual]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...publicUserSelect,
        shops: {
          select: {
            id: true,
            name: true,
            description: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
          },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { shops, ...publicUser } = user;

    return {
      userId: publicUser.id,
      id: publicUser.id,
      name: publicUser.name,
      email: publicUser.email,
      phone: publicUser.phone,
      role: publicUser.role,
      createdAt: publicUser.createdAt,
      updatedAt: publicUser.updatedAt,
      shop: shops[0] ?? null,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });

    if (!existing) {
      throw new UnauthorizedException('User not found');
    }

    const nextEmail = updateProfileDto.email?.trim();
    const nextPhone = updateProfileDto.phone?.trim();
    const nextName = updateProfileDto.name?.trim();

    if (nextEmail && nextEmail !== existing.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: {
          email: nextEmail,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (emailTaken) {
        throw new ConflictException('Email is already in use');
      }
    }

    if (nextPhone && nextPhone !== existing.phone) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: {
          phone: nextPhone,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (phoneTaken) {
        throw new ConflictException('Phone is already in use');
      }
    }

    const data: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    } = {};

    if (nextName) {
      data.name = nextName;
    }

    if (nextEmail) {
      data.email = nextEmail;
    }

    if (typeof updateProfileDto.phone === 'string' && nextPhone) {
      data.phone = nextPhone;
    }

    if (updateProfileDto.password) {
      data.password = await bcrypt.hash(updateProfileDto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      return this.getProfile(userId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getProfile(userId);
  }

  private async issueAuthResponse(user: PublicUser) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}
