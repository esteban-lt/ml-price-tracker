import { MigrationInterface, QueryRunner } from "typeorm";

export class Sessions1792971120708 implements MigrationInterface {
    name = 'Sessions1792971120708'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "family_id" uuid NOT NULL, "user_agent" character varying(512), "ip" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_085d540d9f418cfbdc7bd55bb1" ON "sessions"  ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_abaa9e068cdd390bc5210f7988" ON "sessions"  ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "IDX_sessions_active_family" ON "sessions"  ("family_id", "expires_at") WHERE "revoked_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_sessions_active_family"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abaa9e068cdd390bc5210f7988"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_085d540d9f418cfbdc7bd55bb1"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
    }

}
