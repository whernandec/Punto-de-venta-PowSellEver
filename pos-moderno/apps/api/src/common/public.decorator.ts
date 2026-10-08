import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marca un endpoint como público (sin requerir JWT). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
