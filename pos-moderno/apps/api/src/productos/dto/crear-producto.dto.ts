import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO de entrada para crear un producto. Equivale a la validación que el
 * formulario PRODUCTOS_OK hacía manualmente en el sistema viejo.
 */
export class CrearProductoDto {
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

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
