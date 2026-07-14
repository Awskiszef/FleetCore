import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  ServiceUnavailableException,
  Get,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import * as bcrypt from 'bcrypt';
import jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { Throttle } from '@nestjs/throttler';

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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    try {
      if (!body.email || !body.password)
        throw new UnauthorizedException('Błędne dane logowania');
      const user = await this.authService.validateUser(
        body.email,
        body.password,
      );
      if (!user) {
        throw new UnauthorizedException('Błędne dane logowania');
      }
      return this.authService.login(user);
    } catch (e) {
      throw new UnauthorizedException('Błędne dane logowania');
    }
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
  async changePassword(
    @Request() req: ExpressRequest & { user?: any },
    @Body() body: { oldPassword?: string; newPassword?: string },
  ) {
    const { oldPassword, newPassword } = body;
    if (!newPassword) {
      throw new UnauthorizedException('Nowe hasło jest wymagane');
    }

    const user = await this.usersService.findById(req.user.sub);
    if (!user) throw new UnauthorizedException('Nie znaleziono użytkownika');

    // Only verify old password if the user is not logging in via AWS
    // or if they have a password hash set
    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(
        oldPassword || '',
        user.passwordHash,
      );
      if (!isMatch) {
        throw new UnauthorizedException('Błędne obecne hasło');
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    const loginResponse = await this.authService.login(updatedUser);

    return {
      message: 'Hasło zmienione pomyślnie',
      access_token: loginResponse.access_token,
      user: loginResponse.user,
    };
  }

  @Public()
  @Get('aws/config')
  async getAwsConfig() {
    const domain = await this.settingsService.getValue('awsCognitoDomain');
    const clientId = await this.settingsService.getValue('awsCognitoClientId');
    const redirectUri = await this.settingsService.getValue(
      'awsCognitoRedirectUri',
    );

    return {
      domain: domain || '',
      clientId: clientId || '',
      redirectUri: redirectUri || '',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('aws/callback')
  async awsCallback(@Body() body: { code: string; codeVerifier?: string }) {
    if (!body.code) {
      throw new UnauthorizedException('Błędne dane logowania');
    }

    const domain = await this.settingsService.getValue('awsCognitoDomain');
    const clientId = await this.settingsService.getValue('awsCognitoClientId');
    const redirectUri = await this.settingsService.getValue(
      'awsCognitoRedirectUri',
    );
    const clientSecret = await this.settingsService.getSecret(
      'awsCognitoClientSecret',
    );

    if (!domain || !clientId || !clientSecret || !redirectUri) {
      if (
        process.env.NODE_ENV === 'development' &&
        process.env.AWS_SSO_MOCK_ENABLED === 'true'
      ) {
        const mockUser = await this.usersService.findByEmail('mock@atlashc.pl');
        if (mockUser) return this.authService.login(mockUser);
        throw new UnauthorizedException('Błędne dane logowania');
      }

      if (
        process.env.NODE_ENV === 'production' &&
        process.env.AWS_SSO_MOCK_ENABLED === 'true'
      ) {
        throw new ServiceUnavailableException(
          'Tryb mock niedostępny w produkcji.',
        );
      }

      throw new ServiceUnavailableException(
        'Logowanie AWS SSO nie jest w pełni skonfigurowane.',
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

      const client = jwksClient({
        jwksUri: `${domain}/.well-known/jwks.json`,
      });

      function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
        client.getSigningKey(
          header.kid,
          function (err: Error | null, key?: jwksClient.SigningKey) {
            if (err || !key) return callback(err || new Error('Brak klucza'));
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
          },
        );
      }

      const decoded = await new Promise<jwt.JwtPayload & { email?: string }>(
        (resolve, reject) => {
          jwt.verify(
            tokenData.id_token as string,
            getKey,
            {
              algorithms: ['RS256'],
              issuer: domain,
              audience: clientId,
            },
            function (
              err: Error | null,
              decoded: string | jwt.JwtPayload | undefined,
            ) {
              if (err)
                return reject(new Error('Weryfikacja JWT nie powiodła się'));
              resolve(decoded as jwt.JwtPayload & { email?: string });
            },
          );
        },
      );

      if (!decoded || !decoded.email) {
        throw new UnauthorizedException('Błędne dane logowania');
      }

      const email = decoded.email;
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Błędne dane logowania');
      }

      return this.authService.login(user);
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      throw new UnauthorizedException('Błędne dane logowania');
    }
  }
}
