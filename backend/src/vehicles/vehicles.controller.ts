import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import * as crypto from 'crypto';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(@Body() createVehicleDto: CreateVehicleDto) {
    return await this.vehiclesService.create(createVehicleDto as any);
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return await this.vehiclesService.findAll(query);
  }

  @Get('decode-vin/:vin')
  async decodeVin(@Param('vin') vin: string) {
    const settingKey = await this.prisma.setting.findUnique({
      where: { key: 'vincarioApiKey' },
    });
    const settingSecret = await this.prisma.setting.findUnique({
      where: { key: 'vincarioApiSecret' },
    });

    const apiKey = settingKey?.value || process.env.VIN_API_KEY;
    const apiSecret = settingSecret?.value || process.env.VIN_API_SECRET;

    if (!apiKey || apiKey === 'twoj_klucz_api' || !apiSecret) {
      // Zwracamy błąd 400 z instrukcją, że brakuje płatnego klucza
      throw new Error('BRAK_KLUCZA_API');
    }

    // Używamy autoryzacji opartej na podpisie SHA1 (zgodnie z dokumentacją Vincario)
    try {
      const id = 'decode';
      const vinUpper = vin.toUpperCase();

      // control_sum = sha1(VIN|id|API_KEY|SECRET_KEY)
      const hashStr = `${vinUpper}|${id}|${apiKey}|${apiSecret}`;
      const controlSum = crypto
        .createHash('sha1')
        .update(hashStr)
        .digest('hex')
        .substring(0, 10);

      const url = `https://api.vindecoder.eu/3.2/${apiKey}/${controlSum}/decode/${vinUpper}.json`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('API_ERROR');
      }

      const data = await response.json();

      if (!data.decode) {
        throw new Error('NO_DATA');
      }

      // Zmapuj odpowiedź z tablicy właściwości na nasz obiekt
      const getField = (labels: string[]) => {
        for (const label of labels) {
          const found = data.decode.find((item: any) => item.label === label);
          if (found && found.value) return found.value;
        }
        return '';
      };

      const engineKw = getField([
        'Engine Power (kW)',
        'Engine Power',
        'Power (kW)',
      ]);
      const horsepower = engineKw
        ? Math.round(parseFloat(engineKw) * 1.35962)
        : getField(['Engine Power (HP)', 'Horsepower']);

      return {
        make: getField(['Make']),
        model: getField(['Model', 'Series']),
        productionYear: getField(['Model Year', 'Year']),
        engine: getField([
          'Engine Type',
          'Engine Model',
          'Displacement (L)',
          'Engine displacement (cm3)',
        ]),
        fuelType: getField(['Fuel Type - Primary', 'Fuel Type']),
        horsepower: horsepower ? parseInt(horsepower.toString()) : undefined,
      };
    } catch (error) {
      throw new Error('VIN_DECODE_FAILED');
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return await this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@Param('id') id: string) {
    try {
      return await this.vehiclesService.remove(id);
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
}
