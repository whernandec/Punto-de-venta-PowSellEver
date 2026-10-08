import { IsEnum, IsInt, IsNumber, IsString, Min } from 'class-validator';

export enum TipoMov {
  Entrada = 'Entrada',
  Salida = 'Salida',
}

export class AjusteInventarioDto {
  @IsInt() idProducto!: number;
  @IsInt() idCaja!: number;
  @IsInt() idUsuario!: number;

  @IsEnum(TipoMov)
  tipo!: TipoMov;

  @IsNumber()
  @Min(0.01)
  cantidad!: number;

  @IsString()
  motivo!: string;
}
