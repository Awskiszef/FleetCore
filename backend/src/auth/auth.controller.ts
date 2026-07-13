import { Controller, Post, Body, UnauthorizedException, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('me')
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    if (user) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return req.user;
  }

  @Public()
  @Get('aws/config')
  async getAwsConfig() {
    const settings = await this.prisma.setting.findMany();
    const map = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      domain: map['awsCognitoDomain'] || process.env.AWS_COGNITO_DOMAIN || '',
      clientId: map['awsCognitoClientId'] || process.env.AWS_COGNITO_CLIENT_ID || '',
      redirectUri: map['awsCognitoRedirectUri'] || process.env.AWS_COGNITO_REDIRECT_URI || ''
    };
  }

  @Public()
  @Post('aws/callback')
  async awsCallback(@Body() body: { code: string }) {
    if (!body.code) {
      throw new UnauthorizedException('Brak kodu autoryzacyjnego AWS');
    }

    const settings = await this.prisma.setting.findMany();
    const map = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    const domain = map['awsCognitoDomain'] || process.env.AWS_COGNITO_DOMAIN;
    const clientId = map['awsCognitoClientId'] || process.env.AWS_COGNITO_CLIENT_ID;
    const clientSecret = map['awsCognitoClientSecret'] || process.env.AWS_COGNITO_CLIENT_SECRET;
    const redirectUri = map['awsCognitoRedirectUri'] || process.env.AWS_COGNITO_REDIRECT_URI;

    // Jeżeli zdefiniowano 'mock' w secret, to omijamy AWS by sprawdzić mechanizm na localhoscie
    if (!domain || !clientId || clientSecret === 'twoj_client_secret') {
      const mockUser = await this.usersService.findByEmail('admin@atlashc.pl');
      if (mockUser) return this.authService.login(mockUser);
      throw new UnauthorizedException('Brak konfiguracji AWS SSO (mock timeout)');
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', clientId || '');
      params.append('client_secret', clientSecret || '');
      params.append('redirect_uri', redirectUri || '');
      params.append('code', body.code);

      const tokenResponse = await fetch(`${domain}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (!tokenResponse.ok) {
        throw new UnauthorizedException('Nieudana autoryzacja kodu w AWS Cognito');
      }

      const tokenData = await tokenResponse.json();
      
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(tokenData.id_token) as any;
      
      if (!decoded || !decoded.email) {
        throw new UnauthorizedException('Brak adresu email w tokenie z AWS');
      }

      const email = decoded.email;
      const user = await this.usersService.findByEmail(email);
      
      if (!user) {
        throw new UnauthorizedException('Brak dostępu. Twój adres e-mail nie został dodany do bazy FleetCore.');
      }

      return this.authService.login(user);
    } catch (e) {
      console.error('AWS SSO Error:', e);
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Błąd połączenia z AWS SSO');
    }
  }
}
