import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const u = await this.repo.validarUsuario(dto.login, dto.password);
    if (!u) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const token = await this.jwt.signAsync({
      sub: u.idUsuario,
      login: u.login,
      rol: u.rol,
    });

    return {
      idUsuario: u.idUsuario,
      nombres: u.nombres,
      login: u.login,
      rol: u.rol,
      correo: u.correo,
      token,
    };
  }
}
