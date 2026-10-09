import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { ProductosModule } from './productos/productos.module';
import { VentasModule } from './ventas/ventas.module';
import { AuthModule } from './auth/auth.module';
import { CajaModule } from './caja/caja.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ComprasModule } from './compras/compras.module';
import { InventarioModule } from './inventario/inventario.module';
import { ReportesModule } from './reportes/reportes.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresaModule } from './empresa/empresa.module';
import { ClientesModule } from './clientes/clientes.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { CobrosModule } from './cobros/cobros.module';
import { SerializacionModule } from './serializacion/serializacion.module';
import { TicketModule } from './ticket/ticket.module';
import { CorreoModule } from './correo/correo.module';
import { GruposModule } from './grupos/grupos.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CajaModule,
    ProductosModule,
    VentasModule,
    ProveedoresModule,
    ComprasModule,
    InventarioModule,
    ReportesModule,
    UsuariosModule,
    EmpresaModule,
    ClientesModule,
    FinanzasModule,
    CobrosModule,
    SerializacionModule,
    TicketModule,
    CorreoModule,
    GruposModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guard JWT global: protege todos los endpoints salvo los marcados @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
