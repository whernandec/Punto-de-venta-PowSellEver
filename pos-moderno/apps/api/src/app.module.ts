import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    // Próximos módulos: serialización de comprobantes, ticket, notificaciones/correo.
  ],
  controllers: [HealthController],
})
export class AppModule {}
