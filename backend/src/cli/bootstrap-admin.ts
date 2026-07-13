import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { PrismaService } from '../prisma/prisma.service';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prismaService = app.get(PrismaService);

  try {
    const email =
      process.argv[2] || (await question('Wpisz email administratora: '));
    const password =
      process.argv[3] || (await question('Wpisz hasło administratora: '));

    if (!email || !password) {
      console.error('Email i hasło są wymagane.');
      process.exit(1);
    }

    const existingUser = await prismaService.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      console.error('Użytkownik o podanym adresie email już istnieje.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prismaService.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'Administrator',
        role: 'OWNER',
        mustChangePassword: true,
      },
    });

    console.log(
      `Administrator ${email} utworzony pomyślnie. Przy pierwszym logowaniu zostaniesz poproszony o zmianę hasła.`,
    );
  } catch (error) {
    console.error('Wystąpił błąd:', error);
  } finally {
    rl.close();
    await app.close();
  }
}

bootstrap();
