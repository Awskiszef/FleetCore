import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn(),
  }));
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let usersService: any;
  let settingsService: any;

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({ access_token: 'fake-token' }),
    };
    usersService = {
      findByEmail: jest.fn(),
    };
    settingsService = {
      getAll: jest.fn().mockResolvedValue({}),
      getValue: jest.fn().mockImplementation(async (key) => {
        return undefined; // Or simulated values if needed
      }),
      getSecret: jest.fn().mockImplementation(async (key) => {
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: {} },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    // Mock fetch for AWS token exchange
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id_token: 'fake-id-token' }),
    }) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
    delete process.env.AWS_SSO_MOCK_ENABLED;
    delete process.env.AWS_COGNITO_DOMAIN;
    delete process.env.AWS_COGNITO_CLIENT_ID;
    delete process.env.AWS_COGNITO_CLIENT_SECRET;
    delete process.env.AWS_COGNITO_REDIRECT_URI;
  });

  beforeEach(() => {
    delete process.env.AWS_COGNITO_DOMAIN;
    delete process.env.AWS_COGNITO_CLIENT_ID;
    delete process.env.AWS_COGNITO_CLIENT_SECRET;
    delete process.env.AWS_COGNITO_REDIRECT_URI;
  });

  it('1. Brak konfiguracji AWS zwraca 503, nie token', async () => {
    settingsService.getValue.mockResolvedValue(undefined);
    settingsService.getSecret.mockResolvedValue(undefined);

    await expect(controller.awsCallback({ code: 'code123' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('2. AWS_SSO_MOCK_ENABLED=true w produkcji blokuje callback', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_SSO_MOCK_ENABLED = 'true';
    settingsService.getValue.mockResolvedValue(undefined);
    settingsService.getSecret.mockResolvedValue(undefined);

    await expect(controller.awsCallback({ code: 'code123' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(controller.awsCallback({ code: 'code123' })).rejects.toThrow(
      'Tryb mock niedostępny w produkcji.',
    );
  });

  it('4. Token z błędnym issuer jest odrzucany', async () => {
    settingsService.getValue.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoDomain') return 'https://domain.com';
      if (k === 'awsCognitoClientId') return 'client-id';
      if (k === 'awsCognitoRedirectUri') return 'http://localhost/callback';
      return undefined;
    });
    settingsService.getSecret.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoClientSecret') return 'secret';
      return undefined;
    });

    // Mock jwt.verify to throw error like it would for wrong issuer
    (jwt.verify as jest.Mock).mockImplementation((token, key, options, cb) => {
      cb(new Error('jwt issuer invalid. expected: https://domain.com'));
    });

    await expect(controller.awsCallback({ code: 'code123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('5. Token z błędnym audience jest odrzucany', async () => {
    settingsService.getValue.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoDomain') return 'https://domain.com';
      if (k === 'awsCognitoClientId') return 'client-id';
      if (k === 'awsCognitoRedirectUri') return 'http://localhost/callback';
      return undefined;
    });
    settingsService.getSecret.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoClientSecret') return 'secret';
      return undefined;
    });

    (jwt.verify as jest.Mock).mockImplementation((token, key, options, cb) => {
      cb(new Error('jwt audience invalid. expected: client-id'));
    });

    await expect(controller.awsCallback({ code: 'code123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('6. Token z algorytmem innym niż RS256 jest odrzucany', async () => {
    settingsService.getValue.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoDomain') return 'https://domain.com';
      if (k === 'awsCognitoClientId') return 'client-id';
      if (k === 'awsCognitoRedirectUri') return 'http://localhost/callback';
      return undefined;
    });
    settingsService.getSecret.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoClientSecret') return 'secret';
      return undefined;
    });

    (jwt.verify as jest.Mock).mockImplementation((token, key, options, cb) => {
      cb(new Error('invalid algorithm'));
    });

    await expect(controller.awsCallback({ code: 'code123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('7. Użytkownik nieobecny w lokalnej bazie nie otrzymuje tokenu FleetCore', async () => {
    settingsService.getValue.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoDomain') return 'https://domain.com';
      if (k === 'awsCognitoClientId') return 'client-id';
      if (k === 'awsCognitoRedirectUri') return 'http://localhost/callback';
      return undefined;
    });
    settingsService.getSecret.mockImplementation(async (k: string) => {
      if (k === 'awsCognitoClientSecret') return 'secret';
      return undefined;
    });

    (jwt.verify as jest.Mock).mockImplementation((token, key, options, cb) => {
      cb(null, { email: 'unknown@atlashc.pl' });
    });

    usersService.findByEmail.mockResolvedValue(null);

    await expect(controller.awsCallback({ code: 'code123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('8. Zmiana hasła zwraca nowy token i usuwa flagę mustChangePassword', async () => {
    const mockUser = {
      id: 'user-1',
      passwordHash: 'hash',
      mustChangePassword: true,
    };
    usersService.findById = jest.fn().mockResolvedValue(mockUser);
    const prismaUpdateMock = jest
      .fn()
      .mockResolvedValue({ ...mockUser, mustChangePassword: false });
    const prismaService = { user: { update: prismaUpdateMock } };

    // override prisma in controller for this test
    (controller as any).prisma = prismaService;

    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'newHash');

    authService.login.mockResolvedValue({
      access_token: 'new-token',
      user: { id: 'user-1', mustChangePassword: false },
    });

    const result = await controller.changePassword(
      { user: { sub: 'user-1' } } as any,
      { oldPassword: 'old', newPassword: 'new' },
    );

    expect(prismaUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'newHash', mustChangePassword: false },
    });
    expect(authService.login).toHaveBeenCalledWith({
      ...mockUser,
      mustChangePassword: false,
    });
    expect(result).toEqual({
      message: 'Hasło zmienione pomyślnie',
      access_token: 'new-token',
      user: { id: 'user-1', mustChangePassword: false },
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});
