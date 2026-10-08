import { Module } from '@nestjs/common';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CajaRepository } from './caja.repository';

@Module({
  controllers: [CajaController],
  providers: [CajaService, CajaRepository],
})
export class CajaModule {}
