import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface VentaReporteRow {
  idVenta: number;
  fecha: Date | null;
  comprobante: string | null;
  numeroDoc: string | null;
  montoTotal: number | null;
  tipoPago: string | null;
  cajero: string | null;
}

export interface ResumenVentas {
  numVentas: number;
  total: number;
  efectivo: number;
  tarjeta: number;
  credito: number;
}

/**
 * Reportes de ventas. Consultas Prisma limpias por rango de fechas
 * (evitan el cross join a EMPRESA/Logo de los SPs de reporte originales).
 */
@Injectable()
export class ReportesRepository {
  constructor(private readonly prisma: PrismaService) {}

  ventasPorFechas(desde: string, hasta: string): Promise<VentaReporteRow[]> {
    return this.prisma.$queryRawUnsafe<VentaReporteRow[]>(
      `SELECT v.idventa AS idVenta, v.fecha_venta AS fecha,
              v.Comprobante AS comprobante, v.Numero_de_doc AS numeroDoc,
              v.Monto_total AS montoTotal, v.Tipo_de_pago AS tipoPago,
              u.Nombres_y_Apellidos AS cajero
         FROM ventas v
         LEFT JOIN USUARIO2 u ON u.idUsuario = v.Id_usuario
        WHERE CAST(v.fecha_venta AS date) BETWEEN CAST(@P1 AS date) AND CAST(@P2 AS date)
          AND v.Estado = 'PAGADO'
        ORDER BY v.idventa DESC`,
      desde,
      hasta,
    );
  }

  async resumen(desde: string, hasta: string): Promise<ResumenVentas> {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        numVentas: number;
        total: number | null;
        efectivo: number | null;
        tarjeta: number | null;
        credito: number | null;
      }>
    >(
      `SELECT COUNT(*) AS numVentas,
              SUM(Monto_total) AS total,
              SUM(ISNULL(Efectivo,0)) AS efectivo,
              SUM(ISNULL(Tarjeta,0)) AS tarjeta,
              SUM(ISNULL(Credito,0)) AS credito
         FROM ventas
        WHERE CAST(fecha_venta AS date) BETWEEN CAST(@P1 AS date) AND CAST(@P2 AS date)
          AND Estado = 'PAGADO'`,
      desde,
      hasta,
    );
    const r = rows[0];
    return {
      numVentas: Number(r?.numVentas ?? 0),
      total: Number(r?.total ?? 0),
      efectivo: Number(r?.efectivo ?? 0),
      tarjeta: Number(r?.tarjeta ?? 0),
      credito: Number(r?.credito ?? 0),
    };
  }
}
