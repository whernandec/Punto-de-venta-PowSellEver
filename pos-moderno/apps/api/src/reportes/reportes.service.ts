import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import PDFDocument from 'pdfkit';
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

  /** Genera un PDF del reporte de ventas (pdfkit, sin navegador). */
  async ventasPdf(desde: string, hasta: string): Promise<Buffer> {
    const { filas, resumen } = await this.ventas(desde, hasta);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    doc.fontSize(16).text('Reporte de ventas', { align: 'center' });
    doc.fontSize(10).text(`Del ${desde} al ${hasta}`, { align: 'center' });
    doc.moveDown();

    // Encabezados
    const y0 = doc.y;
    doc.fontSize(9).text('Fecha', 40, y0);
    doc.text('Comprobante', 120, y0);
    doc.text('Cajero', 280, y0);
    doc.text('Pago', 400, y0);
    doc.text('Total', 480, y0, { width: 70, align: 'right' });
    doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();
    doc.moveDown(0.5);

    for (const f of filas) {
      const y = doc.y;
      doc.text(f.fecha ? new Date(f.fecha).toISOString().slice(0, 10) : '', 40, y);
      doc.text(`${f.comprobante ?? ''} ${f.numeroDoc ?? ''}`.trim(), 120, y, { width: 150 });
      doc.text(f.cajero ?? '', 280, y, { width: 110 });
      doc.text(f.tipoPago ?? '', 400, y, { width: 70 });
      doc.text(Number(f.montoTotal ?? 0).toFixed(2), 480, y, { width: 70, align: 'right' });
      doc.moveDown(0.3);
      if (doc.y > 760) doc.addPage();
    }

    doc.moveDown();
    doc.fontSize(11).text(`Nº ventas: ${resumen.numVentas}`, { align: 'right' });
    doc.text(`Total: ${resumen.total.toFixed(2)}`, { align: 'right' });
    doc.text(`Efectivo: ${resumen.efectivo.toFixed(2)}`, { align: 'right' });
    doc.text(`Tarjeta: ${resumen.tarjeta.toFixed(2)}`, { align: 'right' });

    doc.end();
    return done;
  }
}
