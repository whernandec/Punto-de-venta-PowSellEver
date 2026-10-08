import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma gestionado por el contenedor de dependencias de NestJS.
 *
 * Reemplaza el antipatrón del sistema viejo (`CONEXIONMAESTRA.conectar`, una
 * `SqlConnection` estática compartida). Prisma administra un POOL de conexiones
 * de forma segura y concurrente.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // No tumbamos el servidor si la BD no está disponible al arrancar:
    // la API levanta y /health reporta db:error hasta que se recupere.
    try {
      await this.$connect();
      this.logger.log('Conexión a SQL Server establecida.');
    } catch (err) {
      this.logger.warn(
        `No se pudo conectar a SQL Server al iniciar: ${
          err instanceof Error ? err.message : String(err)
        }. La API seguirá arriba; revisa DATABASE_URL.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
