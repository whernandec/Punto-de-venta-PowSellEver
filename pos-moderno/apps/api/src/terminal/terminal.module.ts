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
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/public.decorator';

const CLAVE = 'mercadopago';
const MP_BASE = 'https://api.mercadopago.com/point/integration-api';
const MP_AUTH = process.env.MP_AUTH_DOMAIN ?? 'https://auth.mercadopago.com';
const MP_REDIRECT =
  process.env.MP_REDIRECT_URI ?? 'http://localhost:3000/terminal/oauth/callback';

interface MpConfig {
  enabled: boolean;
  simulacion: boolean;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  conectado?: boolean;
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

  /** true si hay un Access Token REAL (no el simulado). */
  private esTokenReal(c: MpConfig): boolean {
    return !!c.accessToken && !c.accessToken.startsWith('SIM-');
  }

  private exigirTokenReal(c: MpConfig): void {
    if (!this.esTokenReal(c)) {
      throw new BadRequestException(
        'El Access Token guardado es simulado. Pulsa “Desvincular”, pega tu Access ' +
          'Token REAL de Mercado Pago (APP_USR-…) y guarda antes de operar con la terminal.',
      );
    }
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
      conectado: !!c.conectado || !!c.accessToken,
      real: this.esTokenReal(c),
      cuenta: c.userId ?? '',
    };
  }

  /** URL de autorización OAuth de Mercado Pago (o simulada). */
  async urlOauth(): Promise<string> {
    const clientId = process.env.MP_CLIENT_ID;
    const secret = process.env.MP_CLIENT_SECRET;
    // Sin credenciales de vendedor → flujo simulado.
    if (!clientId || !secret) {
      return `${MP_REDIRECT}?code=SIM&state=sim`;
    }
    const state = Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: MP_REDIRECT,
      state,
    });
    return `${MP_AUTH}/authorization?${params.toString()}`;
  }

  /** Intercambia el code por el token y lo guarda. Devuelve HTML. */
  async oauthCallback(code: string): Promise<string> {
    const c = await this.getConfig();
    const clientId = process.env.MP_CLIENT_ID;
    const secret = process.env.MP_CLIENT_SECRET;

    if (!code) return this.htmlResultado(false, 'Falta el código de autorización.');

    if (code === 'SIM' || !clientId || !secret) {
      await this.setConfig({
        ...c,
        accessToken: c.accessToken ?? 'SIM-OAUTH-TOKEN',
        conectado: true,
        userId: c.userId ?? 'cuenta-simulada',
      });
      return this.htmlResultado(true, 'Cuenta de Mercado Pago conectada (simulación).');
    }

    const res = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: MP_REDIRECT,
      }),
    });
    const j = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      user_id?: number;
      message?: string;
    };
    if (!res.ok || !j.access_token) {
      return this.htmlResultado(false, j.message ?? 'No se pudo conectar la cuenta.');
    }
    await this.setConfig({
      ...c,
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      userId: j.user_id ? String(j.user_id) : undefined,
      conectado: true,
    });
    return this.htmlResultado(true, 'Cuenta de Mercado Pago conectada correctamente.');
  }

  async desvincular() {
    const c = await this.getConfig();
    await this.setConfig({
      ...c,
      accessToken: undefined,
      refreshToken: undefined,
      userId: undefined,
      conectado: false,
    });
    return this.obtener();
  }

  private htmlResultado(ok: boolean, msg: string): string {
    const color = ok ? '#16a34a' : '#dc2626';
    const icon = ok ? '✅' : '⚠️';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Mercado Pago</title></head>
      <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f1f5f9">
      <div style="text-align:center;background:#fff;padding:40px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.1)">
      <div style="font-size:48px">${icon}</div>
      <h2 style="color:${color}">${msg}</h2>
      <p>Ya puede cerrar esta ventana y volver al sistema.</p>
      </div></body></html>`;
  }

  async guardar(dto: GuardarTerminalDto) {
    const actual = await this.getConfig();
    const tokenNuevo = dto.accessToken ? dto.accessToken : actual.accessToken;
    const nueva: MpConfig = {
      enabled: dto.enabled ?? actual.enabled,
      simulacion: dto.simulacion ?? actual.simulacion,
      // Si no envían token, se conserva el existente.
      accessToken: tokenNuevo,
      refreshToken: actual.refreshToken,
      // Al pegar un token manual real se considera conectado; se limpia la cuenta simulada.
      conectado: dto.accessToken
        ? !dto.accessToken.startsWith('SIM-')
        : actual.conectado,
      userId: dto.accessToken ? undefined : actual.userId,
      deviceId: dto.deviceId ?? actual.deviceId,
      storeId: dto.storeId ?? actual.storeId,
    };
    await this.setConfig(nueva);
    return this.obtener();
  }

  async dispositivos() {
    const c = await this.getConfig();
    if (c.simulacion || !c.accessToken || c.accessToken.startsWith('SIM-')) {
      return [{ id: 'SIM-DEVICE-1', name: 'Terminal simulada', operating_mode: 'PDV' }];
    }
    const res = await fetch(`${MP_BASE}/devices`, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    const data = (await res.json()) as {
      devices?: Array<{
        id: string;
        operating_mode?: string;
        store_id?: string | number;
        pos_id?: string | number;
        external_pos_id?: string;
      }>;
      message?: string;
    };
    if (!res.ok) {
      throw new BadRequestException(
        data.message ?? 'No se pudieron listar los dispositivos (¿token válido?)',
      );
    }
    return (data.devices ?? []).map((d) => ({
      id: d.id,
      name: d.id,
      operating_mode: d.operating_mode ?? '',
      store_id: d.store_id ? String(d.store_id) : '',
      pos_id: d.pos_id ? String(d.pos_id) : '',
    }));
  }

  /** Valida que el deviceId sea real (no simulado) para operaciones reales. */
  private validarDeviceReal(c: MpConfig): void {
    if (!c.deviceId || c.deviceId.startsWith('SIM-')) {
      throw new BadRequestException(
        'El Device ID configurado es simulado o está vacío. En Configurar → Terminales ' +
          'desactiva “simulación”, pulsa “Probar dispositivos” y elige tu terminal real.',
      );
    }
  }

  /** Pone el dispositivo en modo integrado (PDV) o autónomo (STANDALONE). */
  async modoDispositivo(deviceId: string, modo: 'PDV' | 'STANDALONE') {
    const c = await this.getConfig();
    if (c.simulacion) return { ok: true, simulado: true, modo };
    this.exigirTokenReal(c);
    if (deviceId.startsWith('SIM-')) {
      throw new BadRequestException(
        'El Device ID es simulado. Pulsa “Probar dispositivos” y elige tu terminal real.',
      );
    }
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
    this.exigirTokenReal(c);
    this.validarDeviceReal(c);
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
  @Post('desvincular') desvincular() {
    return this.srv.desvincular();
  }

  // --- OAuth (abiertas en el navegador; sin JWT) ---
  @Public()
  @Get('oauth/start')
  async oauthStart(@Res() res: Response): Promise<void> {
    res.redirect(await this.srv.urlOauth());
  }

  @Public()
  @Get('oauth/callback')
  async oauthCallback(
    @Res() res: Response,
    @Query('code') code?: string,
  ): Promise<void> {
    const html = await this.srv.oauthCallback(code ?? '');
    res.set('Content-Type', 'text/html').send(html);
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
