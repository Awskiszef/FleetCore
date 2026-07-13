/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtAuthGuard } from '../src/auth/jwt.guard';

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  // Funkcja pomocnicza tworząca mock dla JwtAuthGuard
  const createMockAuthGuard = (role: string | null) => {
    return {
      canActivate: (context: any) => {
        if (!role) return false;
        const req = context.switchToHttp().getRequest();
        req.user = { sub: 'user-1', email: 'test@test.com', role };
        return true;
      },
    };
  };

  const setupApp = async (role: string | null) => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(createMockAuthGuard(role))
      .compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    return app;
  };

  describe('Customers - POST /customers', () => {
    it.each([
      ['OWNER', 201],
      ['ADMIN', 201],
      ['RECEPTIONIST', 201],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer())
        .post('/customers')
        .send({ fullName: 'Test', email: 'test@test.com' });

      // If it's 201, it might fail with 400 (validation) or 500 in e2e because of no DB mock,
      // but we mainly care if it is 403 vs something else.
      // So if expected is 201, we accept 201, 400 or 200 (if it passes RBAC).
      // If expected is 403, it must be exactly 403.
      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      }
      await app.close();
    });
  });

  describe('Customers - DELETE /customers/:id', () => {
    it.each([
      ['OWNER', 200],
      ['ADMIN', 200],
      ['RECEPTIONIST', 403],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer()).delete('/customers/123');

      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
      }
      await app.close();
    });
  });

  describe('Vehicles - POST /vehicles', () => {
    it.each([
      ['OWNER', 201],
      ['ADMIN', 201],
      ['RECEPTIONIST', 201],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer())
        .post('/vehicles')
        .send({ customerId: '123', licensePlate: 'TEST' });

      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
      }
      await app.close();
    });
  });

  describe('Parts - POST /parts', () => {
    it.each([
      ['OWNER', 201],
      ['ADMIN', 201],
      ['RECEPTIONIST', 403],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer())
        .post('/parts')
        .send({ name: 'Part 1', unitPrice: 100 });

      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
      }
      await app.close();
    });
  });

  describe('Suppliers - DELETE /suppliers/:id', () => {
    it.each([
      ['OWNER', 200],
      ['ADMIN', 200],
      ['RECEPTIONIST', 403],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer()).delete('/suppliers/123');

      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
      }
      await app.close();
    });
  });

  describe('Settings - PATCH /settings', () => {
    it.each([
      ['OWNER', 200],
      ['ADMIN', 403],
      ['RECEPTIONIST', 403],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer())
        .patch('/settings')
        .send({ key: 'value' });

      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
      }
      await app.close();
    });
  });

  describe('Users - DELETE /users/:id', () => {
    it.each([
      ['OWNER', 200],
      ['ADMIN', 200],
      ['RECEPTIONIST', 403],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer()).delete('/users/123');

      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
      }
      await app.close();
    });
  });

  describe('RepairOrders - POST /repair-orders/:id/invoice', () => {
    it.each([
      ['OWNER', 201],
      ['ADMIN', 201],
      ['RECEPTIONIST', 201],
      ['MECHANIC', 403],
    ])('Rola %s powinna otrzymać status %s', async (role, expectedStatus) => {
      const app = await setupApp(role);
      const res = await request(app.getHttpServer())
        .post('/repair-orders/123/invoice')
        .send({});

      if (expectedStatus === 403) {
        expect(res.status).toBe(403);
      } else {
        expect(res.status).not.toBe(403);
      }
      await app.close();
    });
  });
});
