import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
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

export class ModoTerminalDto {
  @IsString() deviceId!: string;
  @IsString() modo!: 'PDV' | 'STANDALONE';
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

  /** Pone el dispositivo en modo integrado (PDV) o autónomo (STANDALONE). */
  async modoDispositivo(deviceId: string, modo: 'PDV' | 'STANDALONE') {
    const c = await this.getConfig();
    if (c.simulacion || !c.accessToken) return { ok: true, simulado: true, modo };
    const res = await fetch(`${MP_BASE}/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ operating_mode: modo }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      throw new BadRequestException(j.message ?? 'No se pudo cambiar el modo del dispositivo');
    }
    return { ok: true, modo };
  }

  /** Inicia un cobro en la terminal (no bloquea): crea el intent y devuelve su id. */
  async iniciarPago(monto: number) {
    const c = await this.getConfig();
    if (!c.enabled) throw new BadRequestException('La terminal no está habilitada');
    if (c.simulacion) return { intentId: `SIM-${Date.now()}`, simulado: true };
    if (!c.accessToken || !c.deviceId) {
      throw new BadRequestException('Falta access token o dispositivo configurado');
    }
    const crear = await fetch(`${MP_BASE}/devices/${c.deviceId}/payment-intents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(monto * 100),
        additional_info: { print_on_terminal: true, external_reference: `POS-${Date.now()}` },
      }),
    });
    const intent = (await crear.json()) as { id?: string; message?: string };
    if (!crear.ok || !intent.id) {
      throw new BadRequestException(intent.message ?? 'No se pudo crear el cobro');
    }
    return { intentId: intent.id };
  }

  /** Consulta el estado de un cobro: pending | approved | rejected | canceled. */
  async estadoPago(intentId: string) {
    if (intentId.startsWith('SIM-')) return { status: 'approved', simulado: true };
    const c = await this.getConfig();
    if (!c.accessToken) throw new BadRequestException('Falta access token');
    const s = await fetch(`${MP_BASE}/payment-intents/${intentId}`, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    const sj = (await s.json()) as { state?: string };
    const estado = sj.state ?? '';
    let status: 'pending' | 'approved' | 'rejected' | 'canceled' = 'pending';
    if (estado === 'FINISHED') status = 'approved';
    else if (estado === 'CANCELED') status = 'canceled';
    else if (['ERROR', 'REFUNDED'].includes(estado)) status = 'rejected';
    return { status, estado };
  }

  /** Cancela un cobro en curso. */
  async cancelarPago(intentId: string) {
    if (intentId.startsWith('SIM-')) return { status: 'canceled', simulado: true };
    const c = await this.getConfig();
    if (!c.accessToken || !c.deviceId) throw new BadRequestException('Config incompleta');
    const res = await fetch(`${MP_BASE}/devices/${c.deviceId}/payment-intents/${intentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    return { status: res.ok ? 'canceled' : 'error' };
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
  @Post('modo') modo(@Body() dto: ModoTerminalDto) {
    return this.srv.modoDispositivo(dto.deviceId, dto.modo);
  }
  @Post('pago') iniciarPago(@Body() dto: PagoTerminalDto) {
    return this.srv.iniciarPago(dto.monto);
  }
  @Get('pago/:id') estadoPago(@Param('id') id: string) {
    return this.srv.estadoPago(id);
  }
  @Post('pago/:id/cancelar') cancelarPago(@Param('id') id: string) {
    return this.srv.cancelarPago(id);
  }
}

@Module({
  controllers: [TerminalController],
  providers: [TerminalService],
})
export class TerminalModule {}
