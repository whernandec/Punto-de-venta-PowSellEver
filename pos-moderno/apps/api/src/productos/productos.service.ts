import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Workbook } from 'exceljs';
import { ProductosRepository } from './productos.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';

/**
 * Lógica de negocio de Productos.
 * Equivale a `Logica/Lproductos.cs` del sistema viejo.
 */
@Injectable()
export class ProductosService {
  constructor(
    private readonly repo: ProductosRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const producto = await this.repo.findById(id);
    if (!producto) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return producto;
  }

  async create(dto: CrearProductoDto) {
    // Regla de negocio: no permitir código duplicado (como validaba el POS viejo).
    if (dto.codigo) {
      const existente = await this.repo.findByCodigo(dto.codigo);
      if (existente) {
        throw new ConflictException(
          `Ya existe un producto con el código ${dto.codigo}`,
        );
      }
    }

    return this.repo.create({
      descripcion: dto.descripcion,
      codigo: dto.codigo,
      idGrupo: dto.idGrupo,
      usaInventarios: dto.usaInventarios,
      stock: dto.stock,
      precioDeCompra: dto.precioCompra,
      precioDeVenta: dto.precioVenta,
      precioMayoreo: dto.precioMayoreo,
      impuesto: dto.impuesto,
      stockMinimo: dto.stockMinimo,
      seVendeA: dto.seVendeA,
      aPartirDe: dto.aPartirDe,
      fechaVencimiento: dto.fechaVencimiento,
    });
  }

  async update(id: number, dto: ActualizarProductoDto) {
    await this.findOne(id); // 404 si no existe
    return this.repo.update(id, {
      descripcion: dto.descripcion,
      codigo: dto.codigo,
      idGrupo: dto.idGrupo,
      usaInventarios: dto.usaInventarios,
      stock: dto.stock,
      precioDeCompra: dto.precioCompra,
      precioDeVenta: dto.precioVenta,
      precioMayoreo: dto.precioMayoreo,
      impuesto: dto.impuesto,
      stockMinimo: dto.stockMinimo,
      seVendeA: dto.seVendeA,
      aPartirDe: dto.aPartirDe,
      fechaVencimiento: dto.fechaVencimiento,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { deleted: true, id };
  }

  // ---- Importación / plantilla Excel ----

  private static COLUMNAS = [
    'Descripcion',
    'Codigo',
    'Grupo',
    'Impuesto',
    'P_Compra',
    'P_Venta',
    'P_Mayoreo',
    'Stock',
    'Stock_Minimo',
    'UsaInventarios',
  ];

  async plantillaExcel(): Promise<Buffer> {
    const wb = new Workbook();
    const ws = wb.addWorksheet('Productos');
    ws.addRow(ProductosService.COLUMNAS);
    ws.getRow(1).font = { bold: true };
    ws.addRow([
      'COCA COLA 600ML',
      '7501234567890',
      'BEBIDAS',
      '0',
      10,
      15,
      13,
      100,
      5,
      'SI',
    ]);
    ws.columns.forEach((c) => (c.width = 16));
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /** Importa productos desde un .xlsx. La 1ª fila son encabezados. */
  async importarExcel(
    buffer: Buffer,
  ): Promise<{ creados: number; omitidos: number; errores: string[] }> {
    const wb = new Workbook();
    try {
      // Cast por diferencia de tipos Buffer entre @types/node 20 y ExcelJS.
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException('No se pudo leer el archivo Excel');
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('El archivo no tiene hojas');

    const norm = (s: unknown): string =>
      String(s ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');

    const col: Record<string, number> = {};
    ws.getRow(1).eachCell((cell, c) => {
      col[norm(cell.value)] = c;
    });

    const valor = (row: ReturnType<typeof ws.getRow>, keys: string[]): unknown => {
      for (const k of keys) {
        const c = col[k];
        if (c) {
          const v = row.getCell(c).value as unknown;
          if (v != null && v !== '') {
            return typeof v === 'object' && v !== null && 'result' in v
              ? (v as { result: unknown }).result
              : v;
          }
        }
      }
      return undefined;
    };
    const num = (v: unknown): number => (v == null || v === '' ? 0 : Number(v) || 0);

    const grupos = await this.prisma.grupoDeProductos.findMany();
    const grupoMap = new Map(
      grupos.map((g) => [(g.linea ?? '').toLowerCase(), g.idLine]),
    );
    const codigos = new Set(
      (await this.prisma.producto.findMany({ select: { codigo: true } }))
        .map((p) => (p.codigo ?? '').toLowerCase())
        .filter(Boolean),
    );

    let creados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const descripcion = String(
        valor(row, ['descripcion', 'nombre', 'producto']) ?? '',
      ).trim();
      if (!descripcion) continue;
      try {
        const codigo = String(
          valor(row, ['codigo', 'codigodebarras', 'barcode']) ?? '',
        ).trim();
        if (codigo && codigos.has(codigo.toLowerCase())) {
          omitidos++;
          continue;
        }

        const grupoNombre = String(
          valor(row, ['grupo', 'linea', 'categoria']) ?? '',
        ).trim();
        let idGrupo: number | undefined;
        if (grupoNombre) {
          const key = grupoNombre.toLowerCase();
          idGrupo = grupoMap.get(key);
          if (!idGrupo) {
            const g = await this.prisma.grupoDeProductos.create({
              data: { linea: grupoNombre, porDefecto: 'NO' },
            });
            grupoMap.set(key, g.idLine);
            idGrupo = g.idLine;
          }
        }

        const usa = String(
          valor(row, ['usainventarios', 'controlarinventarios', 'inventario']) ??
            'SI',
        ).toUpperCase();

        await this.prisma.producto.create({
          data: {
            descripcion,
            codigo: codigo || null,
            idGrupo,
            precioDeCompra: num(valor(row, ['pcompra', 'costo', 'preciocompra'])),
            precioDeVenta: num(valor(row, ['pventa', 'venta', 'precioventa'])),
            precioMayoreo: num(valor(row, ['pmayoreo', 'mayoreo'])),
            stockMinimo: num(valor(row, ['stockminimo', 'minimo'])),
            stock: String(num(valor(row, ['stock', 'hay']))),
            impuesto: String(valor(row, ['impuesto']) ?? '0'),
            usaInventarios: usa.startsWith('N') ? 'NO' : 'SI',
            seVendeA: 'UNIDAD',
          },
        });
        if (codigo) codigos.add(codigo.toLowerCase());
        creados++;
      } catch (e) {
        errores.push(`Fila ${r}: ${(e as Error).message}`);
      }
    }

    return { creados, omitidos, errores };
  }
}
