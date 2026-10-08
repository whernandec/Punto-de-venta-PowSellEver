import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { ReportesRepository } from './reportes.repository';

@Injectable()
export class ReportesService {
  constructor(private readonly repo: ReportesRepository) {}

  async ventas(desde: string, hasta: string) {
    const [filas, resumen] = await Promise.all([
      this.repo.ventasPorFechas(desde, hasta),
      this.repo.resumen(desde, hasta),
    ]);
    return { desde, hasta, resumen, filas };
  }

  /** Genera un .xlsx real con el detalle de ventas del rango. */
  async ventasExcel(desde: string, hasta: string): Promise<Buffer> {
    const { filas, resumen } = await this.ventas(desde, hasta);

    const wb = new Workbook();
    const ws = wb.addWorksheet('Ventas');

    ws.addRow([`Reporte de ventas  ${desde} a ${hasta}`]);
    ws.addRow([]);
    ws.addRow(['ID', 'Fecha', 'Comprobante', 'Documento', 'Cajero', 'Pago', 'Total']);
    ws.getRow(3).font = { bold: true };

    for (const f of filas) {
      ws.addRow([
        f.idVenta,
        f.fecha ? new Date(f.fecha).toISOString().slice(0, 10) : '',
        f.comprobante ?? '',
        f.numeroDoc ?? '',
        f.cajero ?? '',
        f.tipoPago ?? '',
        Number(f.montoTotal ?? 0),
      ]);
    }

    ws.addRow([]);
    ws.addRow(['', '', '', '', '', 'Nº ventas', resumen.numVentas]);
    ws.addRow(['', '', '', '', '', 'Total', resumen.total]);
    ws.addRow(['', '', '', '', '', 'Efectivo', resumen.efectivo]);
    ws.addRow(['', '', '', '', '', 'Tarjeta', resumen.tarjeta]);
    ws.addRow(['', '', '', '', '', 'Crédito', resumen.credito]);

    ws.columns.forEach((c) => (c.width = 16));

    const data = await wb.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
