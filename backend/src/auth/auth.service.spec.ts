import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '60s' },
        }),
      ],
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('login should omit passwordHash from returned user and correctly encode mustChangePassword in JWT', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      mustChangePassword: false,
      passwordHash: 'secret-hash-123',
    };

    const result = await service.login(mockUser);

    // Verify user object doesn't have passwordHash
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('test@test.com');

    // Verify JWT payload
    const decodedToken = jwtService.verify(result.access_token);
    expect(decodedToken.sub).toBe('user-1');
    expect(decodedToken.email).toBe('test@test.com');
    expect(decodedToken.role).toBe('ADMIN');
    expect(decodedToken.mustChangePassword).toBe(false);
  });
});
