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

export class CompraLineaDto {
  @IsInt() idProducto!: number;
  @IsString() descripcion!: string;
  @IsNumber() @Min(0) cantidad!: number;
  @IsNumber() @Min(0) costo!: number;
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() @IsString() usaInventarios?: string;
}

export class RegistrarCompraDto {
  @IsInt() idCaja!: number;
  @IsInt() idUsuario!: number;
  @IsInt() idProveedor!: number;
  @IsOptional() @IsString() fechaCompra?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CompraLineaDto)
  lineas!: CompraLineaDto[];
}
