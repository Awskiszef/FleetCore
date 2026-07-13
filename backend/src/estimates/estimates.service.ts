import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as PdfPrinter from 'pdfmake';
import type { Response } from 'express';

@Injectable()
export class EstimatesService {
  constructor(private prisma: PrismaService) {}

  async create(createEstimateDto: CreateEstimateDto, userId: string) {
    const { repairOrderId, validUntil, notes, items } = createEstimateDto;

    let totalNet = 0;
    let totalGross = 0;

    const formattedItems = items.map(item => {
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
          create: formattedItems
        }
      },
      include: {
        items: true,
      }
    });
  }

  async findAllByRepairOrder(repairOrderId: string) {
    return this.prisma.estimate.findMany({
      where: { repairOrderId },
      include: { items: true, createdByUser: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id },
      include: { items: true, repairOrder: { include: { customer: true, vehicle: true } } }
    });
    if (!estimate) throw new NotFoundException('Estimate not found');
    return estimate;
  }

  async generatePdf(id: string, res: Response) {
    const estimate = await this.findOne(id);
    
    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new (PdfPrinter as any)(fonts);

    const docDefinition = {
      content: [
        { text: `Kosztorys Naprawy`, style: 'header' },
        { text: `Dla: ${estimate.repairOrder.customer.fullName}` },
        { text: `Pojazd: ${estimate.repairOrder.vehicle.make} ${estimate.repairOrder.vehicle.model}` },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['Nazwa', 'Ilość', 'Cena Netto', 'VAT', 'Wartość Brutto'],
              ...estimate.items.map(i => [
                i.name,
                i.quantity.toString(),
                `${i.unitPrice} PLN`,
                `${i.taxRate}%`,
                `${i.totalGross} PLN`
              ]),
              [{ text: 'Suma', colSpan: 4, alignment: 'right' }, {}, {}, {}, `${estimate.totalGross} PLN`]
            ]
          }
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition as any);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kosztorys_${id}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  }
}
