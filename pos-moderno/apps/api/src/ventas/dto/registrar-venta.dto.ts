import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class VentaLineaDto {
  @IsInt()
  idProducto!: number;

  @IsString()
  descripcion!: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsNumber()
  @Min(0)
  cantidad!: number;

  @IsNumber()
  @Min(0)
  precioUnitario!: number;

  @IsOptional()
  @IsNumber()
  costo?: number;

  @IsOptional()
  @IsString()
  usaInventarios?: string;

  @IsOptional()
  @IsString()
  unidadDeMedida?: string;

  @IsOptional()
  @IsString()
  seVendeA?: string;

  @IsOptional()
  @IsString()
  moneda?: string;
}

export class RegistrarVentaDto {
  @IsInt()
  idCaja!: number;

  @IsInt()
  idUsuario!: number;

  @IsOptional()
  @IsInt()
  idCliente?: number;

  @IsString()
  tipoPago!: string;

  @IsString()
  numeroDeDoc!: string;

  @IsOptional()
  @IsString()
  comprobante?: string;

  @IsNumber()
  @Min(0)
  montoTotal!: number;

  @IsOptional()
  @IsNumber()
  igv?: number;

  @IsOptional()
  @IsNumber()
  porcentajeIgv?: number;

  @IsOptional()
  @IsNumber()
  pagoCon?: number;

  @IsOptional()
  @IsNumber()
  vuelto?: number;

  @IsOptional()
  @IsNumber()
  efectivo?: number;

  @IsOptional()
  @IsNumber()
  tarjeta?: number;

  @IsOptional()
  @IsNumber()
  credito?: number;

  @IsOptional()
  @IsNumber()
  saldo?: number;

  @IsOptional()
  @IsString()
  referenciaTarjeta?: string;

  @IsOptional()
  @IsString()
  fechaVenta?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VentaLineaDto)
  lineas!: VentaLineaDto[];
}
