import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Put,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

const CLAVE = 'mercadopago';
const MP_BASE = 'https://api.mercadopago.com/point/integration-api';

interface MpConfig {
  enabled: boolean;
  simulacion: boolean;
  accessToken?: string;
  deviceId?: string;
  storeId?: string;
}

export class GuardarTerminalDto {
  @IsOptional() @IsString() accessToken?: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() enabled?: boolean;
  @IsOptional() simulacion?: boolean;
}

export class PagoTerminalDto {
  @IsNumber() @Min(0.01) monto!: number;
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class TerminalService {
  constructor(private readonly prisma: PrismaService) {}

  private async getConfig(): Promise<MpConfig> {
    const row = await this.prisma.appConfig.findUnique({ where: { clave: CLAVE } });
    if (row?.valor) return JSON.parse(row.valor) as MpConfig;
    return { enabled: false, simulacion: true };
  }

  private async setConfig(c: MpConfig): Promise<void> {
    const valor = JSON.stringify(c);
    await this.prisma.appConfig.upsert({
      where: { clave: CLAVE },
      create: { clave: CLAVE, valor },
      update: { valor },
    });
  }

  /** Config pública (sin exponer el access token). */
  async obtener() {
    const c = await this.getConfig();
    return {
      proveedor: 'mercadopago',
      enabled: !!c.enabled,
      simulacion: c.simulacion !== false,
      deviceId: c.deviceId ?? '',
      storeId: c.storeId ?? '',
      tokenConfigurado: !!c.accessToken,
    };
  }

  async guardar(dto: GuardarTerminalDto) {
    const actual = await this.getConfig();
    const nueva: MpConfig = {
      enabled: dto.enabled ?? actual.enabled,
      simulacion: dto.simulacion ?? actual.simulacion,
      // Si no envían token, se conserva el existente.
      accessToken: dto.accessToken ? dto.accessToken : actual.accessToken,
      deviceId: dto.deviceId ?? actual.deviceId,
      storeId: dto.storeId ?? actual.storeId,
    };
    await this.setConfig(nueva);
    return this.obtener();
  }

  async dispositivos() {
    const c = await this.getConfig();
    if (c.simulacion || !c.accessToken) {
      return [{ id: 'SIM-DEVICE-1', name: 'Terminal simulada' }];
    }
    const res = await fetch(`${MP_BASE}/devices`, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    const data = (await res.json()) as { devices?: Array<{ id: string; name?: string }> };
    if (!res.ok) throw new BadRequestException('No se pudieron listar los dispositivos');
    return (data.devices ?? []).map((d) => ({ id: d.id, name: d.name ?? d.id }));
  }

  /** Cobra un monto en la terminal. Devuelve el estado final. */
  async pagar(monto: number) {
    const c = await this.getConfig();
    if (!c.enabled) throw new BadRequestException('La terminal no está habilitada');

    if (c.simulacion) {
      await delay(800); // simula la interacción con el cliente
      return { status: 'approved', id: `SIM-${Date.now()}`, simulado: true };
    }

    if (!c.accessToken || !c.deviceId) {
      throw new BadRequestException('Falta access token o dispositivo configurado');
    }

    const auth = { Authorization: `Bearer ${c.accessToken}` };
    const crear = await fetch(`${MP_BASE}/devices/${c.deviceId}/payment-intents`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(monto * 100),
        additional_info: { print_on_terminal: true, external_reference: `POS-${Date.now()}` },
      }),
    });
    const intent = (await crear.json()) as { id?: string; message?: string };
    if (!crear.ok || !intent.id) {
      throw new BadRequestException(intent.message ?? 'No se pudo crear el cobro');
    }

    // Poll del estado hasta ~80s.
    for (let i = 0; i < 40; i++) {
      await delay(2000);
      const s = await fetch(`${MP_BASE}/payment-intents/${intent.id}`, { headers: auth });
      const sj = (await s.json()) as { state?: string };
      if (sj.state === 'FINISHED') return { status: 'approved', id: intent.id };
      if (['CANCELED', 'ERROR', 'REFUNDED'].includes(sj.state ?? '')) {
        return { status: 'rejected', id: intent.id, estado: sj.state };
      }
    }
    return { status: 'timeout', id: intent.id };
  }
}

@Controller('terminal')
export class TerminalController {
  constructor(private readonly srv: TerminalService) {}

  @Get() obtener() {
    return this.srv.obtener();
  }
  @Put() guardar(@Body() dto: GuardarTerminalDto) {
    return this.srv.guardar(dto);
  }
  @Get('dispositivos') dispositivos() {
    return this.srv.dispositivos();
  }
  @Post('pago') pagar(@Body() dto: PagoTerminalDto) {
    return this.srv.pagar(dto.monto);
  }
}

@Module({
  controllers: [TerminalController],
  providers: [TerminalService],
})
export class TerminalModule {}
