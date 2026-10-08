import { IsInt, IsNumber, Min } from 'class-validator';

export class AperturaCajaDto {
  @IsInt()
  idCaja!: number;

  @IsInt()
  idUsuario!: number;

  @IsNumber()
  @Min(0)
  saldoInicial!: number;
}

export class CierreCajaDto {
  @IsInt()
  idCaja!: number;

  @IsInt()
  idUsuario!: number;

  @IsNumber()
  ingresos!: number;

  @IsNumber()
  egresos!: number;

  @IsNumber()
  saldoQuedaEnCaja!: number;

  @IsNumber()
  totalCalculado!: number;

  @IsNumber()
  totalReal!: number;

  @IsNumber()
  diferencia!: number;
}
