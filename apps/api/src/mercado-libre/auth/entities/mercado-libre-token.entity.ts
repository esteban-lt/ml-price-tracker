import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

export const MERCADO_LIBRE_TOKEN_ID = 1;

@Entity('mercado_libre_token')
@Check(`"id" = ${MERCADO_LIBRE_TOKEN_ID}`)
export class MercadoLibreToken {
  @PrimaryColumn({ type: 'int', default: MERCADO_LIBRE_TOKEN_ID })
  id: number;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;
}
