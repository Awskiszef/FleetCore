import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

import { SettingsService } from '../settings/settings.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email?: string, password?: string }) {
    if (!body.email || !body.password) throw new UnauthorizedException('Brak danych logowania');
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('me')
  async getProfile(@Request() req: ExpressRequest & { user?: any }) {
    if (!req.user) return null;
    const user = await this.usersService.findById(req.user.sub);
    if (user) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return req.user;
  }

  @Post('change-password')
  async changePassword(@Request() req: ExpressRequest & { user?: any }, @Body() body: { oldPassword?: string, newPassword?: string }) {
    const { oldPassword, newPassword } = body;
    if (!newPassword) {
      throw new UnauthorizedException('Nowe hasło jest wymagane');
    }

    const user = await this.usersService.findById(req.user.sub);
    if (!user) throw new UnauthorizedException('Nie znaleziono użytkownika');

    // Only verify old password if the user is not logging in via AWS
    // or if they have a password hash set
    if (user.passwordHash) {
      const bcrypt = require('bcrypt');
      const isMatch = await bcrypt.compare(
        oldPassword || '',
        user.passwordHash,
      );
      if (!isMatch) {
        throw new UnauthorizedException('Błędne obecne hasło');
      }
    }

    const bcrypt = require('bcrypt');
    const newHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return { message: 'Hasło zmienione pomyślnie' };
  }

  @Public()
  @Get('aws/config')
  async getAwsConfig() {
    const map = await this.settingsService.getAll(false);

    return {
      domain: map['awsCognitoDomain'] || process.env.AWS_COGNITO_DOMAIN || '',
      clientId:
        map['awsCognitoClientId'] || process.env.AWS_COGNITO_CLIENT_ID || '',
      redirectUri:
        map['awsCognitoRedirectUri'] ||
        process.env.AWS_COGNITO_REDIRECT_URI ||
        '',
    };
  }

  @Public()
  @Post('aws/callback')
  async awsCallback(@Body() body: { code: string; codeVerifier?: string }) {
    if (!body.code) {
      throw new UnauthorizedException('Brak kodu autoryzacyjnego AWS');
    }

    const map = await this.settingsService.getAll(false);

    const domain = map['awsCognitoDomain'] || process.env.AWS_COGNITO_DOMAIN;
    const clientId =
      map['awsCognitoClientId'] || process.env.AWS_COGNITO_CLIENT_ID;
    const clientSecret =
      map['awsCognitoClientSecret'] || process.env.AWS_COGNITO_CLIENT_SECRET;
    const redirectUri =
      map['awsCognitoRedirectUri'] || process.env.AWS_COGNITO_REDIRECT_URI;

    // Jeżeli zdefiniowano 'mock' w secret, to omijamy AWS by sprawdzić mechanizm na localhoscie
    if (!domain || !clientId || clientSecret === 'twoj_client_secret') {
      const mockUser = await this.usersService.findByEmail('admin@atlashc.pl');
      if (mockUser) return this.authService.login(mockUser);
      throw new UnauthorizedException(
        'Brak konfiguracji AWS SSO (mock timeout)',
      );
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', clientId || '');
      params.append('client_secret', clientSecret || '');
      params.append('redirect_uri', redirectUri || '');
      params.append('code', body.code);
      if (body.codeVerifier) {
        params.append('code_verifier', body.codeVerifier);
      }

      const tokenResponse = await fetch(`${domain}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!tokenResponse.ok) {
        throw new UnauthorizedException(
          'Nieudana autoryzacja kodu w AWS Cognito',
        );
      }

      const tokenData = await tokenResponse.json();

      const jwksClient = require('jwks-rsa');
      const jwt = require('jsonwebtoken');

      const client = jwksClient({
        jwksUri: `${domain}/.well-known/jwks.json`,
      });

      function getKey(header: any, callback: any) {
        client.getSigningKey(header.kid, function (err: any, key: any) {
          if (err) return callback(err);
          const signingKey = key.publicKey || key.rsaPublicKey;
          callback(null, signingKey);
        });
      }

      const decoded = (await new Promise((resolve, reject) => {
        jwt.verify(
          tokenData.id_token,
          getKey,
          {
            issuer: domain,
            audience: clientId,
          },
          function (err: any, decoded: any) {
            if (err) return reject(err);
            resolve(decoded);
          },
        );
      })) as any;

      if (!decoded || !decoded.email) {
        throw new UnauthorizedException('Brak adresu email w tokenie z AWS');
      }

      const email = decoded.email;
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        throw new UnauthorizedException(
          'Brak dostępu. Twój adres e-mail nie został dodany do bazy FleetCore.',
        );
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
