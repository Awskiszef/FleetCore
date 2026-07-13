import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { PrismaService } from '../prisma/prisma.service';
import pdfMake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Response } from 'express';

@Injectable()
export class EstimatesService {
  constructor(private prisma: PrismaService) { }

  async create(createEstimateDto: CreateEstimateDto, userId: string) {
    const { repairOrderId, validUntil, notes, items } = createEstimateDto;

    let totalNet = 0;
    let totalGross = 0;

    const formattedItems = items.map((item) => {
      const taxRate = item.taxRate ?? 23;
      const net = item.quantity * item.unitPrice;
      const gross = net * (1 + taxRate / 100);

      totalNet += net;
      totalGross += gross;

      return {
        type: item.type,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        totalNet: net,
        totalGross: gross,
      };
    });

    return this.prisma.estimate.create({
      data: {
        repairOrderId,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
        totalNet,
        totalGross,
        createdByUserId: userId,
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
      },
    });
  }

  async findAllByRepairOrder(repairOrderId: string) {
    return this.prisma.estimate.findMany({
      where: { repairOrderId },
      include: { items: true, createdByUser: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id },
      include: {
        items: true,
        repairOrder: { include: { customer: true, vehicle: true } },
      },
    });
    if (!estimate) throw new NotFoundException('Estimate not found');
    return estimate;
  }

  async generatePdf(id: string, res: Response) {
    try {
      const estimate = await this.findOne(id);

      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique',
        },
      };

      pdfMake.setFonts(fonts);

      const docDefinition: TDocumentDefinitions = {
        content: [
          {
            text: 'Kosztorys naprawy',
            style: 'header',
          },
          {
            text: `Numer kosztorysu: ${estimate.id}`,
            margin: [0, 0, 0, 5],
          },
          {
            text: `Data utworzenia: ${new Date(
              estimate.createdAt,
            ).toLocaleDateString('pl-PL')}`,
            margin: [0, 0, 0, 10],
          },
          {
            text: `Klient: ${estimate.repairOrder.customer?.fullName || 'Brak danych'
              }`,
          },
          {
            text: `Pojazd: ${estimate.repairOrder.vehicle
                ? `${estimate.repairOrder.vehicle.make || ''} ${estimate.repairOrder.vehicle.model || ''
                }`
                : 'Brak danych'
              }`,
            margin: [0, 0, 0, 15],
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 45, 80, 45, 90],
              body: [
                [
                  'Nazwa',
                  'Ilość',
                  'Cena netto',
                  'VAT',
                  'Wartość brutto',
                ],
                ...estimate.items.map((item) => [
                  item.name,
                  item.quantity.toString(),
                  `${Number(item.unitPrice).toFixed(2)} PLN`,
                  `${Number(item.taxRate).toFixed(0)}%`,
                  `${Number(item.totalGross).toFixed(2)} PLN`,
                ]),
                [
                  {
                    text: 'Suma',
                    colSpan: 4,
                    alignment: 'right',
                    bold: true,
                  },
                  {},
                  {},
                  {},
                  {
                    text: `${Number(estimate.totalGross).toFixed(2)} PLN`,
                    bold: true,
                  },
                ],
              ],
            },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 15],
          },
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10,
        },
      };

      const pdf = pdfMake.createPdf(docDefinition);
      const buffer = await pdf.getBuffer();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kosztorys_${id}.pdf"`,
      );
      res.setHeader('Content-Length', buffer.length);

      return res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Błąd generowania kosztorysu PDF:', error);

      if (!res.headersSent) {
        return res.status(500).json({
          message:
            error instanceof Error
              ? error.message
              : 'Nie udało się wygenerować kosztorysu PDF',
          statusCode: 500,
        });
      }
    }
  }
}