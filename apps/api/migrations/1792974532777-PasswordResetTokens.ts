import { MigrationInterface, QueryRunner } from "typeorm";

export class PasswordResetTokens1792974532777 implements MigrationInterface {
    name = 'PasswordResetTokens1792974532777'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_52ac39dd8a28730c63aeb428c9c" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_91185d86d5d7557b19abbb2868" ON "password_reset_tokens"  ("token_hash") `);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_91185d86d5d7557b19abbb2868"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    }

}
