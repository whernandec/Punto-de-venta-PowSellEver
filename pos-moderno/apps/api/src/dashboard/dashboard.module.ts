import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumen() {
    const raw = this.prisma.$queryRawUnsafe.bind(this.prisma);

    const [kpis] = await raw<
      Array<Record<string, unknown>>
    >(`SELECT
        (SELECT ISNULL(SUM(Saldo),0) FROM clientes WHERE Saldo>0) AS cobrar,
        (SELECT ISNULL(SUM(Saldo),0) FROM Proveedores WHERE Saldo>0) AS pagar,
        (SELECT ISNULL(SUM(dv.Ganancia),0) FROM detalle_venta dv
           INNER JOIN ventas v ON v.idventa=dv.idventa WHERE v.Estado='PAGADO') AS ganancia,
        (SELECT COUNT(*) FROM Producto1
           WHERE Usa_inventarios='SI' AND TRY_CAST(Stock AS numeric(18,2))<=Stock_minimo) AS stockBajo,
        (SELECT COUNT(*) FROM clientes WHERE Estado<>'ELIMINADO' AND Nombre<>'GENERICO') AS numClientes,
        (SELECT COUNT(*) FROM Producto1) AS numProductos,
        (SELECT ISNULL(SUM(Monto_total),0) FROM ventas WHERE Estado='PAGADO') AS totalVentas`);

    const ventasMes = await raw<Array<{ anio: number; mes: number; total: number }>>(
      `SELECT YEAR(fecha_venta) AS anio, MONTH(fecha_venta) AS mes, SUM(Monto_total) AS total
         FROM ventas WHERE Estado='PAGADO' AND fecha_venta IS NOT NULL
        GROUP BY YEAR(fecha_venta), MONTH(fecha_venta)
        ORDER BY anio, mes`,
    );

    const topProductos = await raw<Array<{ producto: string; cantidad: number }>>(
      `SELECT TOP 5 p.Descripcion AS producto, SUM(dv.cantidad) AS cantidad
         FROM detalle_venta dv
         INNER JOIN ventas v ON v.idventa = dv.idventa
         INNER JOIN Producto1 p ON p.Id_Producto1 = dv.Id_producto
        WHERE v.Estado='PAGADO'
        GROUP BY p.Descripcion
        ORDER BY SUM(dv.cantidad) DESC`,
    );

    const gastosConcepto = await raw<Array<{ concepto: string; total: number }>>(
      `SELECT ISNULL(c.Descripcion,'(sin concepto)') AS concepto, SUM(g.Importe) AS total
         FROM Gastos_varios g LEFT JOIN Conceptos c ON c.Id_concepto=g.Id_concepto
        GROUP BY c.Descripcion ORDER BY SUM(g.Importe) DESC`,
    );

    const gastosMes = await raw<Array<{ anio: number; mes: number; total: number }>>(
      `SELECT YEAR(Fecha) AS anio, MONTH(Fecha) AS mes, SUM(Importe) AS total
         FROM Gastos_varios WHERE Fecha IS NOT NULL
        GROUP BY YEAR(Fecha), MONTH(Fecha) ORDER BY anio, mes`,
    );

    const n = (v: unknown): number => Number(v ?? 0);
    const etiqueta = (anio: number, mes: number): string =>
      `${MESES[(mes ?? 1) - 1]} ${anio}`;

    const ahora = new Date();
    return {
      mes: `${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][ahora.getMonth()]} ${ahora.getFullYear()}`,
      kpis: {
        cuentasPorCobrar: n(kpis?.cobrar),
        cuentasPorPagar: n(kpis?.pagar),
        ganancia: n(kpis?.ganancia),
        stockBajo: n(kpis?.stockBajo),
        numClientes: n(kpis?.numClientes),
        numProductos: n(kpis?.numProductos),
      },
      totalVentas: n(kpis?.totalVentas),
      totalGanancia: n(kpis?.ganancia),
      ventasPorMes: ventasMes.map((r) => ({ mes: etiqueta(r.anio, r.mes), total: n(r.total) })),
      topProductos: topProductos.map((r) => ({ producto: r.producto, cantidad: n(r.cantidad) })),
      gastosPorConcepto: gastosConcepto.map((r) => ({ concepto: r.concepto, total: n(r.total) })),
      gastosPorMes: gastosMes.map((r) => ({ mes: etiqueta(r.anio, r.mes), total: n(r.total) })),
    };
  }
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly srv: DashboardService) {}

  @Get()
  resumen() {
    return this.srv.resumen();
  }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
