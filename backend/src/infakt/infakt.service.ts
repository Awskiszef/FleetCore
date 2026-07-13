import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class InfaktService {
  private readonly apiUrl = 'https://api.infakt.pl/api/v3';

  constructor(private settingsService: SettingsService) {}

  private async getHeaders() {
    const apiKey = await this.settingsService.getSecret('infaktApiKey');

    if (!apiKey || apiKey === 'wprowadz_tutaj_swoj_klucz_api_infakt') {
      throw new HttpException(
        'Brak ważnego klucza API inFakt w ustawieniach lub pliku .env',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      'Content-Type': 'application/json',
      'X-inFakt-ApiKey': apiKey,
    };
  }

  // 1. Znajdź lub utwórz klienta
  async findOrCreateClient(customerData: any): Promise<number> {
    // Parse address
    let parsedStreet = customerData.address || '';
    let parsedCity = '-';
    let parsedPostalCode = '';

    if (customerData.address) {
      // Try to extract zip code: PL (XX-XXX), CZ/SK (XXX XX), generic (4-5 digits)
      const zipMatch = customerData.address.match(
        /((?:\d{2}-\d{3}|\d{3}\s\d{2}|\d{4,5}))\s+([^,]+)/,
      );
      if (zipMatch) {
        parsedPostalCode = zipMatch[1];
        parsedCity = zipMatch[2].trim();

        let remaining = customerData.address.replace(zipMatch[0], '').trim();
        remaining = remaining
          .replace(/,\s*,\s*/g, ', ')
          .replace(/,\s*$/, '')
          .trim();
        if (remaining.startsWith(','))
          remaining = remaining.substring(1).trim();
        parsedStreet = remaining || '-';
      } else {
        const parts = customerData.address.split(',');
        if (parts.length > 1) {
          parsedCity = parts[parts.length - 1].trim();
          parsedStreet = parts
            .slice(0, parts.length - 1)
            .join(',')
            .trim();
        } else {
          parsedStreet = customerData.address;
          parsedCity = '-';
        }
      }
    }

    let country = 'PL';
    if (customerData.nip && /^[A-Z]{2}/i.test(customerData.nip)) {
      country = customerData.nip.substring(0, 2).toUpperCase();
    }

    const clientPayload = {
      client: {
        company_name: customerData.companyName || customerData.fullName,
        nip: customerData.nip || '',
        street: parsedStreet,
        city: parsedCity,
        postal_code: parsedPostalCode,
        phone_number: customerData.phone || '',
        email: customerData.email || '',
        country: country,
      },
    };

    let clientId: number | null = null;

    if (customerData.nip) {
      // Szukaj klienta po NIP
      try {
        const response = await fetch(
          `${this.apiUrl}/clients.json?q[company_name_or_nip_eq]=${customerData.nip}`,
          {
            headers: await this.getHeaders(),
          },
        );
        const data = await response.json();
        if (data && data.entities && data.entities.length > 0) {
          clientId = data.entities[0].id;
        }
      } catch (e) {
        console.error('Error finding inFakt client', e);
      }
    }

    if (clientId) {
      // Zaktualizuj klienta najnowszym adresem
      await fetch(`${this.apiUrl}/clients/${clientId}.json`, {
        method: 'PUT',
        headers: await this.getHeaders(),
        body: JSON.stringify(clientPayload),
      });
    } else {
      // Utwórz nowego klienta
      const response = await fetch(`${this.apiUrl}/clients.json`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(clientPayload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new HttpException(
          `Błąd podczas tworzenia klienta w inFakt: ${JSON.stringify(err)}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = await response.json();
      clientId = data.id;
    }

    if (!clientId) {
      throw new HttpException(
        'Nie udało się uzyskać ID klienta z inFakt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return clientId;
  }

  // 2. Wystaw fakturę
  async createInvoice(
    orderData: any,
    clientId: number,
  ): Promise<{ id: number; uuid: string }> {
    const today = new Date().toISOString().split('T')[0];
    const vehicleInfo = orderData.vehicle
      ? `${orderData.vehicle.make} ${orderData.vehicle.model} rej. ${orderData.vehicle.licensePlate}`
      : 'Pojazd nieznany';

    // Upewniamy się, że kwota jest brutto i poprawna
    const finalCost = orderData.finalCost || orderData.estimatedCost || 0;
    // inFakt wymaga podania ceny netto dla vat 23% lub ceny brutto z odpowiednim typem.
    // Domyślnie zrobimy prostą fakturę "gross" (brutto).
    const netCost = finalCost / 1.23;

    let isForeign = false;
    let taxSymbol = '23';
    let calculatedNetCost = netCost;
    let serviceNamePrefix = 'Usługa naprawy pojazdu:';

    if (orderData.customer?.nip && /^[A-Z]{2}/i.test(orderData.customer.nip)) {
      const countryCode = orderData.customer.nip.substring(0, 2).toUpperCase();
      if (countryCode !== 'PL') {
        isForeign = true;
        taxSymbol = 'np'; // nie podlega (odwrotne obciążenie dla usług)
        calculatedNetCost = finalCost; // netto = brutto

        switch (countryCode) {
          case 'DE':
          case 'AT':
            serviceNamePrefix = 'Fahrzeugreparaturservice:';
            break;
          case 'CZ':
            serviceNamePrefix = 'Služba opravy vozidla:';
            break;
          case 'SK':
            serviceNamePrefix = 'Služba opravy vozidiel:';
            break;
          case 'FR':
            serviceNamePrefix = 'Service de réparation de véhicules:';
            break;
          case 'ES':
            serviceNamePrefix = 'Servicio de reparación de vehículos:';
            break;
          case 'IT':
            serviceNamePrefix = 'Servizio di riparazione veicoli:';
            break;
          case 'UA':
            serviceNamePrefix = 'Послуга з ремонту транспортного засобу:';
            break;
          default:
            serviceNamePrefix = 'Vehicle repair service:';
        }
      }
    }

    const invoicePayload: any = {
      invoice: {
        payment_method: 'transfer', // przelew
        client_id: clientId,
        invoice_date: today,
        sale_date: today,
        sale_type: 'service',
        status: orderData.invoiceStatus || 'draft',
        services: [
          {
            name: `${serviceNamePrefix} ${vehicleInfo}`,
            tax_symbol: taxSymbol,
            unit_net_price: Math.round(calculatedNetCost * 100), // inFakt przyjmuje grosze
            quantity: 1,
            unit: 'usł.',
            gross_price: Math.round(finalCost * 100),
          },
        ],
      },
    };

    const response = await fetch(`${this.apiUrl}/invoices.json`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(invoicePayload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new HttpException(
        `Błąd podczas wystawiania faktury w inFakt: ${JSON.stringify(err)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await response.json();

    // W inFakcie link do wydruku faktury można uzyskać z UUID, np.
    // https://www.infakt.pl/faktury/{uuid}/drukuj.pdf
    return {
      id: data.id,
      uuid: data.uuid,
    };
  }

  // Zmień status faktury
  async updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/invoices/${invoiceId}.json`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify({ invoice: { status } }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new HttpException(
        `Błąd podczas zmiany statusu faktury: ${JSON.stringify(err)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 3. Sprawdź czy faktura istnieje
  async checkInvoiceExists(invoiceId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/invoices/${invoiceId}.json`,
        {
          headers: await this.getHeaders(),
        },
      );
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  // 4. Pobierz PDF
  async downloadInvoicePdf(invoiceId: string): Promise<ArrayBuffer> {
    const response = await fetch(
      `${this.apiUrl}/invoices/${invoiceId}/pdf.json?document_type=original`,
      {
        headers: await this.getHeaders(),
      },
    );
    if (!response.ok) {
      throw new HttpException(
        'Nie można pobrać pliku PDF z inFakt',
        HttpStatus.NOT_FOUND,
      );
    }
    return await response.arrayBuffer();
  }

  // 5. Pobierz listę faktur z danego miesiąca
  async getInvoicesByMonth(year: number, month: number): Promise<any[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const response = await fetch(
      `${this.apiUrl}/invoices.json?q[invoice_date_gteq]=${startDate}&q[invoice_date_lteq]=${endDate}&limit=100`,
      {
        headers: await this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new HttpException(
        'Nie można pobrać faktur z inFakt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const data = await response.json();
    return data.entities || [];
  }
}
