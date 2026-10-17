import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792264946777 implements MigrationInterface {
    name = 'InitialSchema1792264946777'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."store_enum" AS ENUM('mercado_libre', 'amazon')`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "store" "public"."store_enum" NOT NULL, "external_id" character varying NOT NULL, "name" character varying NOT NULL, "url" character varying NOT NULL, "image_url" character varying, "is_available" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a130e330ba05e74609a9da2c06" ON "products"  ("store", "external_id") `);
        await queryRunner.query(`CREATE TABLE "price_history" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "product_id" uuid NOT NULL, "price" numeric(10,2) NOT NULL, "original_price" numeric(10,2), "sellers_count" integer, "currency" character varying(3) NOT NULL DEFAULT 'MXN', "checked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e41e25472373d4b574b153229e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d1a8157d3ce920d3100cddf7bd" ON "price_history"  ("product_id", "checked_at") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "email_verified_at" TIMESTAMP WITH TIME ZONE, "email_notifications" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."threshold_type_enum" AS ENUM('price_below', 'percentage_drop')`);
        await queryRunner.query(`CREATE TYPE "public"."tracking_status_enum" AS ENUM('active', 'paused')`);
        await queryRunner.query(`CREATE TABLE "tracked_products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "product_id" uuid NOT NULL, "threshold_type" "public"."threshold_type_enum" NOT NULL DEFAULT 'price_below', "threshold_value" numeric(10,2) NOT NULL, "reference_price" numeric(10,2), "status" "public"."tracking_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_69dfeabd6c6756b6fb07be10d43" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ee2c00a9b693fcbafeb641c789" ON "tracked_products"  ("user_id", "product_id") `);
        await queryRunner.query(`CREATE TYPE "public"."alert_status_enum" AS ENUM('pending', 'sent', 'failed', 'skipped')`);
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tracked_product_id" uuid NOT NULL, "price_history_id" uuid NOT NULL, "status" "public"."alert_status_enum" NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT '0', "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9ab2cb08c09490bff00c7285e5" ON "alerts"  ("tracked_product_id", "price_history_id") `);
        await queryRunner.query(`CREATE TABLE "email_verification_codes" ("user_id" uuid NOT NULL, "code_hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_d18df5dff26676faed7d3e1640b" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TABLE "mercado_libre_token" ("id" integer NOT NULL DEFAULT '1', "refresh_token" text NOT NULL, CONSTRAINT "CHK_cc3a1f5e768ec041ba1b1a6163" CHECK ("id" = 1), CONSTRAINT "PK_ceb3e7c7fa0cb6182b9e3219708" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "price_history" ADD CONSTRAINT "FK_ebdb4d54c8de7847c0f7a9e4fbb" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tracked_products" ADD CONSTRAINT "FK_65d39a6e9bfd1268429cfe8be25" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tracked_products" ADD CONSTRAINT "FK_674a45038ab80ad1e727187b5a4" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_6dc457ac5d9728f49daafb0efee" FOREIGN KEY ("tracked_product_id") REFERENCES "tracked_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_3625e8133db2b964ae0603c4cd0" FOREIGN KEY ("price_history_id") REFERENCES "price_history"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_verification_codes" ADD CONSTRAINT "FK_d18df5dff26676faed7d3e1640b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_verification_codes" DROP CONSTRAINT "FK_d18df5dff26676faed7d3e1640b"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_3625e8133db2b964ae0603c4cd0"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_6dc457ac5d9728f49daafb0efee"`);
        await queryRunner.query(`ALTER TABLE "tracked_products" DROP CONSTRAINT "FK_674a45038ab80ad1e727187b5a4"`);
        await queryRunner.query(`ALTER TABLE "tracked_products" DROP CONSTRAINT "FK_65d39a6e9bfd1268429cfe8be25"`);
        await queryRunner.query(`ALTER TABLE "price_history" DROP CONSTRAINT "FK_ebdb4d54c8de7847c0f7a9e4fbb"`);
        await queryRunner.query(`DROP TABLE "mercado_libre_token"`);
        await queryRunner.query(`DROP TABLE "email_verification_codes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ab2cb08c09490bff00c7285e5"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
        await queryRunner.query(`DROP TYPE "public"."alert_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee2c00a9b693fcbafeb641c789"`);
        await queryRunner.query(`DROP TABLE "tracked_products"`);
        await queryRunner.query(`DROP TYPE "public"."tracking_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."threshold_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d1a8157d3ce920d3100cddf7bd"`);
        await queryRunner.query(`DROP TABLE "price_history"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a130e330ba05e74609a9da2c06"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TYPE "public"."store_enum"`);
    }

}
