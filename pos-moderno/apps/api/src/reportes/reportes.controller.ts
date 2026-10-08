import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  /** Reporte de ventas (JSON) por rango de fechas. */
  @Get('ventas')
  ventas(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportes.ventas(desde ?? hoy(), hasta ?? hoy());
  }

  /** Mismo reporte exportado como Excel (.xlsx). */
  @Get('ventas.xlsx')
  async excel(
    @Res() res: Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ): Promise<void> {
    const buffer = await this.reportes.ventasExcel(desde ?? hoy(), hasta ?? hoy());
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ventas_${desde ?? hoy()}_${hasta ?? hoy()}.xlsx"`,
    });
    res.send(buffer);
  }
}
