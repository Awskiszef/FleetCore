// Trigger IDE TS Server reload
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, Res, Query } from '@nestjs/common';
import { RepairOrdersService } from './repair-orders.service';
import { InfaktService } from '../infakt/infakt.service';
import { Prisma } from '@prisma/client';

@Controller('repair-orders')
export class RepairOrdersController {
  constructor(
    private readonly repairOrdersService: RepairOrdersService,
    private readonly infaktService: InfaktService,
  ) {}

  @Post()
  create(@Body() createRepairOrderDto: Prisma.RepairOrderUncheckedCreateInput) {
    return this.repairOrdersService.create(createRepairOrderDto);
  }

  @Get()
  findAll() {
    return this.repairOrdersService.findAll();
  }

  @Get('invoices/list')
  async getAppInvoices(@Query('year') year: string, @Query('month') month: string) {
    const y = parseInt(year);
    const m = parseInt(month);
    if (!y || !m) {
      throw new HttpException('Invalid year or month', HttpStatus.BAD_REQUEST);
    }

    // 1. Fetch invoices from inFakt for the month
    const infaktInvoices = await this.infaktService.getInvoicesByMonth(y, m);
    
    // 2. Extract invoice IDs (as strings, because inFakt IDs are numbers, but we store them as strings)
    const infaktIds = infaktInvoices.map((inv: any) => inv.id.toString());
    
    // 3. Find matching repair orders in our database
    const orders = await this.repairOrdersService.findAll() as any[];
    
    // 4. Filter inFakt invoices to only those that have a matching repair order
    const result = [];
    for (const inv of infaktInvoices) {
      const matchingOrder = orders.find(o => o.invoiceId === inv.id.toString());
      if (matchingOrder) {
        result.push({
          infaktInvoice: inv,
          repairOrder: matchingOrder
        });
      }
    }
    
    return result;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.repairOrdersService.findOne(id);
  }

  @Post(':id/invoice')
  async createInvoice(@Param('id') id: string, @Body() body: { status?: string }) {
    // 1. Pobierz dane zlecenia (wraz z klientem i pojazdem)
    const order = await this.repairOrdersService.findOne(id) as any;
    if (!order) throw new HttpException('Nie znaleziono zlecenia', HttpStatus.NOT_FOUND);
    if (!order.customer) throw new HttpException('Zlecenie nie ma przypisanego klienta', HttpStatus.BAD_REQUEST);
    
    // 2. Znajdź lub utwórz klienta w inFakcie
    const clientId = await this.infaktService.findOrCreateClient(order.customer);
    
    // 3. Wystaw fakturę
    const orderWithStatus = { ...order, invoiceStatus: body?.status || 'draft' };
    const invoice = await this.infaktService.createInvoice(orderWithStatus, clientId);
    
    // 4. Zapisz ID i UUID w bazie danych
    const invoiceUrl = `https://www.infakt.pl/faktury/${invoice.uuid}/drukuj.pdf`;
    
    const updatedOrder = await this.repairOrdersService.update(id, {
      invoiceId: invoice.id.toString(),
      invoiceUrl: invoiceUrl
    } as any);
    
    return updatedOrder;
  }

  @Patch(':id/invoice-status')
  async updateInvoiceStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const order = await this.repairOrdersService.findOne(id);
    if (!order || !order.invoiceId) {
      throw new HttpException('Faktura nie istnieje w zleceniu.', HttpStatus.NOT_FOUND);
    }
    await this.infaktService.updateInvoiceStatus(order.invoiceId, body.status);
    return { success: true };
  }

  @Get(':id/invoice-check')
  async checkInvoiceStatus(@Param('id') id: string) {
    const order = await this.repairOrdersService.findOne(id) as any;
    if (!order || !order.invoiceId) {
      return { exists: false };
    }
    const exists = await this.infaktService.checkInvoiceExists(order.invoiceId);
    if (!exists) {
      await this.repairOrdersService.update(id, { invoiceId: null, invoiceUrl: null } as any);
      return { exists: false, updated: true };
    }
    return { exists: true };
  }

  @Get(':id/invoice-pdf')
  async downloadInvoicePdf(@Param('id') id: string, @Res() res: any) {
    const order = await this.repairOrdersService.findOne(id) as any;
    if (!order || !order.invoiceId) {
      return res.status(404).send('Brak faktury');
    }
    try {
      const pdfBuffer = await this.infaktService.downloadInvoicePdf(order.invoiceId);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Faktura_${order.id.substring(0,8)}.pdf"`,
      });
      res.send(Buffer.from(pdfBuffer));
    } catch (e) {
      res.status(500).send('Błąd podczas pobierania pliku PDF');
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRepairOrderDto: Prisma.RepairOrderUncheckedUpdateInput) {
    return this.repairOrdersService.update(id, updateRepairOrderDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.repairOrdersService.remove(id);
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new HttpException(
          'Foreign key constraint violated',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  @Post(':id/parts')
  async addPart(
    @Param('id') id: string,
    @Body() data: { partId: string; quantity: number }
  ) {
    return this.repairOrdersService.addPart(id, data.partId, data.quantity);
  }

  @Delete(':id/parts/:partId')
  async removePart(
    @Param('id') id: string,
    @Param('partId') partId: string
  ) {
    return this.repairOrdersService.removePart(id, partId);
  }
}
