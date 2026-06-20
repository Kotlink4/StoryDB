using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnsureStructureScopeAndAssignmentTargetColumnsEf : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'Structures'
                          AND column_name = 'ApplicationScope'
                    ) THEN
                        ALTER TABLE "Structures"
                            ADD "ApplicationScope" text NOT NULL DEFAULT 'characters';
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE "StructureAssignments"
                    DROP CONSTRAINT IF EXISTS "FK_StructureAssignments_Objects_StoryObjectId";

                DROP INDEX IF EXISTS "IX_StructureAssignments_ProjectId_StoryObjectId";
                DROP INDEX IF EXISTS "IX_StructureAssignments_ProjectId_StoryObjectId_StructureUsageId";
                DROP INDEX IF EXISTS "IX_StructureAssignments_StructureUsageId_StructureNodeId_StoryObjectId";

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'StructureAssignments'
                          AND column_name = 'TargetKind'
                    ) THEN
                        ALTER TABLE "StructureAssignments"
                            ADD "TargetKind" character varying(40) NOT NULL DEFAULT 'storyObject';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'StructureAssignments'
                          AND column_name = 'TargetId'
                    ) THEN
                        ALTER TABLE "StructureAssignments"
                            ADD "TargetId" integer NOT NULL DEFAULT 0;
                    END IF;
                END $$;

                UPDATE "StructureAssignments"
                SET "TargetKind" = 'storyObject'
                WHERE "TargetKind" = '';

                UPDATE "StructureAssignments"
                SET "TargetId" = "StoryObjectId"
                WHERE "TargetId" = 0;

                ALTER TABLE "StructureAssignments"
                    ALTER COLUMN "StoryObjectId" DROP NOT NULL;

                CREATE INDEX IF NOT EXISTS "IX_StructureAssignments_ProjectId_TargetKind_TargetId"
                    ON "StructureAssignments" ("ProjectId", "TargetKind", "TargetId");

                CREATE INDEX IF NOT EXISTS "IX_StructureAssignments_ProjectId_TargetKind_TargetId_StructureUsageId"
                    ON "StructureAssignments" ("ProjectId", "TargetKind", "TargetId", "StructureUsageId");

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_StructureAssignments_StructureUsageId_StructureNodeId_TargetKind_TargetId"
                    ON "StructureAssignments" ("StructureUsageId", "StructureNodeId", "TargetKind", "TargetId");

                ALTER TABLE "StructureAssignments"
                    ADD CONSTRAINT "FK_StructureAssignments_Objects_StoryObjectId"
                    FOREIGN KEY ("StoryObjectId") REFERENCES "Objects" ("Id") ON DELETE SET NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
