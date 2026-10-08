import { IsNumber, IsOptional, IsString } from 'class-validator';

/** Campos opcionales para actualizaciones parciales (PATCH) de un producto. */
export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsNumber()
  idGrupo?: number;

  @IsOptional()
  @IsString()
  usaInventarios?: string;

  @IsOptional()
  @IsString()
  stock?: string;

  @IsOptional()
  @IsNumber()
  precioCompra?: number;

  @IsOptional()
  @IsNumber()
  precioVenta?: number;

  @IsOptional()
  @IsNumber()
  precioMayoreo?: number;

  @IsOptional()
  @IsString()
  impuesto?: string;

  @IsOptional()
  @IsNumber()
  stockMinimo?: number;
}
