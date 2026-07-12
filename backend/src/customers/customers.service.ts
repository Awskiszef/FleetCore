import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({ data });
  }

  async findAll() {
    return this.prisma.customer.findMany({
      include: {
        vehicles: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        vehicles: true,
        repairOrders: true,
      },
    });
  }

  async update(id: string, data: Prisma.CustomerUpdateInput) {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async fetchNip(nip: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const kasUrl = `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`;
      
      const kasResponse = await fetch(kasUrl);
      if (!kasResponse.ok) {
        throw new HttpException('Błąd podczas pobierania danych z API MF.', HttpStatus.BAD_REQUEST);
      }
      
      const kasData = await kasResponse.json();
      if (!kasData?.result?.subject) {
        throw new HttpException('Nie znaleziono firmy o podanym NIP w bazie MF.', HttpStatus.NOT_FOUND);
      }
      
      const subject = kasData.result.subject;
      const name = subject.name;
      let address = subject.workingAddress || subject.residenceAddress || '';
      
      // Sprawdzenie KRS (Ministerstwo Sprawiedliwości)
      if (subject.krs) {
        try {
          const krsUrl = `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${subject.krs}?rejestr=P&format=json`;
          const krsResponse = await fetch(krsUrl);
          if (krsResponse.ok) {
            const krsData = await krsResponse.json();
            const adr = krsData?.odpis?.dane?.dzial1?.siedzibaIAdres?.adres;
            if (adr) {
              const street = adr.ulica ? `ul. ${adr.ulica}` : '';
              const house = adr.nrDomu || '';
              const local = adr.nrLokalu ? `/${adr.nrLokalu}` : '';
              const city = adr.miejscowosc || '';
              const postal = adr.kodPocztowy || '';
              
              const fullStreet = [street, house + local].filter(Boolean).join(' ').trim();
              const fullCity = [postal, city].filter(Boolean).join(' ').trim();
              
              if (fullStreet || fullCity) {
                address = `${fullStreet}, ${fullCity}`.replace(/^, /, '').trim();
              }
            }
          }
        } catch (e) {
          console.error("Błąd podczas pobierania z KRS:", e);
        }
      }
      
      return {
        name,
        address,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Błąd wewnętrzny serwera przy odpytywaniu urzędów.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
