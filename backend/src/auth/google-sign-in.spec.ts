import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { LoginTicket } from 'google-auth-library';

import { UserRole } from '../../generated/prisma/enums';
import { PLATFORM_ADMIN_EMAIL } from '../admin/admin.constants';
import { OtpService } from '../mail/otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const mockVerifyToken = jest.fn<Promise<LoginTicket>, [unknown]>();

jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../mail/otp.service', () => ({ OtpService: class OtpService {} }));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyToken,
  })),
}));

describe('Google sign-in', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('session-token') };
  const config = {
    get: jest.fn((key: string) =>
      key === 'GOOGLE_WEB_CLIENT_ID' ? 'web-client-id' : undefined,
    ),
  };
  let service: AuthService;

  const user = {
    id: 'user-id',
    name: 'Example',
    email: 'person@example.com',
    phone: null,
    role: UserRole.CUSTOMER,
    photoUrl: null,
    emailVerified: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function googlePayload(email: string, verified = true) {
    return {
      getPayload: () => ({
        email,
        email_verified: verified,
        name: 'Google Name',
      }),
    } as LoginTicket;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVerifyToken.mockResolvedValue(googlePayload(' Person@Example.com '));
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: OtpService, useValue: {} },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it.each([UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN])(
    'signs in an existing %s without changing its role',
    async (role) => {
      prisma.user.findUnique.mockResolvedValue({ ...user, role });

      const result = await service.signInWithGoogle({
        idToken: 'google-token',
      });

      expect(result).toMatchObject({
        found: true,
        accessToken: 'session-token',
        user: { id: user.id, role },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'person@example.com' } }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: user.id, role }),
      );
    },
  );

  it('returns the verified identity without creating an unknown account', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.signInWithGoogle({ idToken: 'google-token' }),
    ).resolves.toEqual({
      found: false,
      email: 'person@example.com',
      name: 'Google Name',
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('marks an existing unverified email as verified without changing its role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      role: UserRole.BARBER,
      emailVerified: false,
    });
    prisma.user.update.mockResolvedValue({ ...user, role: UserRole.BARBER });

    const result = await service.signInWithGoogle({ idToken: 'google-token' });

    expect(result).toMatchObject({
      found: true,
      user: { role: UserRole.BARBER },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
    );
  });

  it('rejects invalid and unverified Google tokens before looking up an account', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('invalid token'));
    await expect(
      service.signInWithGoogle({ idToken: 'invalid' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    mockVerifyToken.mockResolvedValueOnce(
      googlePayload('person@example.com', false),
    );
    await expect(
      service.signInWithGoogle({ idToken: 'unverified' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not offer registration for the reserved admin email', async () => {
    mockVerifyToken.mockResolvedValueOnce(googlePayload(PLATFORM_ADMIN_EMAIL));
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.signInWithGoogle({ idToken: 'google-token' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('continues to authenticate an existing user by email and password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      password: await bcrypt.hash('correct-password', 4),
    });
    await expect(
      service.login({
        email: 'PERSON@example.com',
        password: 'correct-password',
      }),
    ).resolves.toMatchObject({
      accessToken: 'session-token',
      user: { id: user.id },
    });
    await expect(
      service.login({ email: user.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
