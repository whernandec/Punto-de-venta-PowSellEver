import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { bufferAFoto, fotoABuffer } from '../common/foto';

// --- DTOs ---
export class CrearUsuarioDto {
  @IsString() @IsNotEmpty() nombres!: string;
  @IsString() @IsNotEmpty() login!: string;
  @IsString() @MinLength(4) password!: string;
  @IsOptional() @IsString() correo?: string;
  @IsOptional() @IsString() rol?: string;
  /** Foto del cajero/admin como data URL (base64). */
  @IsOptional() @IsString() foto?: string;
}
export class ActualizarUsuarioDto {
  @IsOptional() @IsString() nombres?: string;
  @IsOptional() @IsString() login?: string;
  @IsOptional() @IsString() @MinLength(4) password?: string;
  @IsOptional() @IsString() correo?: string;
  @IsOptional() @IsString() rol?: string;
  @IsOptional() @IsString() foto?: string;
}

// --- Service (lógica + guardas, nativo Prisma) ---
@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const rows = await this.prisma.usuario.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        idUsuario: true,
        nombresApellidos: true,
        login: true,
        password: true,
        correo: true,
        rol: true,
        estado: true,
        icono: true,
        nombreDeIcono: true,
      },
      orderBy: { idUsuario: 'asc' },
    });
    // Normaliza al contrato de @pos/types (nombres) e incluye password para la
    // grilla de administración (paridad con el sistema legacy; aún en texto plano).
    return rows.map((r) => ({
      idUsuario: r.idUsuario,
      nombres: r.nombresApellidos,
      login: r.login,
      password: r.password,
      correo: r.correo,
      rol: r.rol,
      estado: r.estado,
      foto: bufferAFoto(r.icono, r.nombreDeIcono),
    }));
  }

  async crear(dto: CrearUsuarioDto) {
    const dup = await this.prisma.usuario.findFirst({
      where: { login: dto.login, estado: 'ACTIVO' },
      select: { idUsuario: true },
    });
    if (dup) throw new ConflictException(`Ya existe un usuario con login ${dto.login}`);

    const foto = fotoABuffer(dto.foto);
    const u = await this.prisma.usuario.create({
      data: {
        nombresApellidos: dto.nombres,
        login: dto.login,
        password: dto.password, // TODO Fase 4: hashear (bcrypt) en migración de datos
        correo: dto.correo ?? '',
        rol: dto.rol ?? 'Cajero',
        estado: 'ACTIVO',
        ...(foto ? { icono: foto.buffer, nombreDeIcono: foto.mime } : {}),
      },
      select: { idUsuario: true, login: true },
    });
    return u;
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { idUsuario: id },
    });
    if (!existe) throw new NotFoundException(`Usuario ${id} no encontrado`);

    const foto = fotoABuffer(dto.foto);
    await this.prisma.usuario.update({
      where: { idUsuario: id },
      data: {
        nombresApellidos: dto.nombres ?? undefined,
        login: dto.login ?? undefined,
        password: dto.password ?? undefined,
        correo: dto.correo ?? undefined,
        rol: dto.rol ?? undefined,
        ...(foto ? { icono: foto.buffer, nombreDeIcono: foto.mime } : {}),
      },
    });
    return { actualizado: true, idUsuario: id };
  }

  async eliminar(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { idUsuario: id } });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    if (u.login === 'admin') {
      throw new BadRequestException('El usuario admin no se puede eliminar');
    }
    // Baja lógica (igual que el SP eliminar_usuario).
    await this.prisma.usuario.update({
      where: { idUsuario: id },
      data: { estado: 'ELIMINADO' },
    });
    return { eliminado: true, idUsuario: id };
  }
}

// --- Controller ---
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly srv: UsuariosService) {}

  @Get()
  listar() {
    return this.srv.listar();
  }

  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.srv.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.srv.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.srv.eliminar(id);
  }
}

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
