import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bufferAFoto } from '../common/foto';

/** Usuario validado, normalizado (independiente de SP o nativo). */
export interface UsuarioValidado {
  idUsuario: number;
  nombres: string | null;
  login: string | null;
  rol: string | null;
  correo: string | null;
  foto: string | null;
}

/** Fila cruda del SP validar_usuario (SELECT * FROM USUARIO2). */
interface UsuarioRow {
  idUsuario: number;
  Nombres_y_Apellidos: string | null;
  Login: string | null;
  Rol: string | null;
  Correo: string | null;
}

/**
 * Autenticación. Conmutable con AUTH_NATIVO (Fase 4):
 *  - SP (legacy): EXEC validar_usuario.
 *  - NATIVO: consulta Prisma sobre USUARIO2.
 *
 * NOTA: la contraseña está en TEXTO PLANO en la BD actual; en la migración de
 * datos debe hashearse (bcrypt) y cambiar la comparación.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async validarUsuario(
    login: string,
    password: string,
  ): Promise<UsuarioValidado | null> {
    if (process.env.AUTH_NATIVO === 'true') {
      const u = await this.prisma.usuario.findFirst({
        where: { login, password, estado: 'ACTIVO' },
      });
      return u
        ? {
            idUsuario: u.idUsuario,
            nombres: u.nombresApellidos,
            login: u.login,
            rol: u.rol,
            correo: u.correo,
            foto: bufferAFoto(u.icono, u.nombreDeIcono),
          }
        : null;
    }

    const filas = await this.prisma.$queryRawUnsafe<UsuarioRow[]>(
      'EXEC dbo.validar_usuario @P1, @P2',
      password,
      login,
    );
    const u = filas[0];
    if (!u) return null;
    // El SP no devuelve la imagen; la leemos aparte para mostrar quién atiende.
    const extra = await this.prisma.usuario.findUnique({
      where: { idUsuario: u.idUsuario },
      select: { icono: true, nombreDeIcono: true },
    });
    return {
      idUsuario: u.idUsuario,
      nombres: u.Nombres_y_Apellidos,
      login: u.Login,
      rol: u.Rol,
      correo: u.Correo,
      foto: bufferAFoto(extra?.icono, extra?.nombreDeIcono),
    };
  }
}
