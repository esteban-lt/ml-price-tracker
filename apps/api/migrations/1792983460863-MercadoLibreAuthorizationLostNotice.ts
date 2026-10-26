import { MigrationInterface, QueryRunner } from "typeorm";

export class MercadoLibreAuthorizationLostNotice1792983460863 implements MigrationInterface {
    name = 'MercadoLibreAuthorizationLostNotice1792983460863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mercado_libre_token" ADD "authorization_lost_notified_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mercado_libre_token" DROP COLUMN "authorization_lost_notified_at"`);
    }

}
