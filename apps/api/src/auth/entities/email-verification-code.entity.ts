import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

// Un solo código activo por usuario: pedir otro reemplaza al anterior.
@Entity('email_verification_codes')
export class EmailVerificationCode {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // HMAC del código; el código en claro solo viaja por correo.
  @Column({ name: 'code_hash', type: 'varchar' })
  codeHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;
}
