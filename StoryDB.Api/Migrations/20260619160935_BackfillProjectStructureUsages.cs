using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class BackfillProjectStructureUsages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO "StructureUsages"
                    ("ProjectId", "StructureId", "TargetKind", "TargetId", "DisplayName", "Notes", "IsPrimary", "CreatedAt", "UpdatedAt")
                SELECT
                    structure."ProjectId",
                    structure."Id",
                    'project',
                    structure."ProjectId",
                    NULL,
                    NULL,
                    FALSE,
                    NOW(),
                    NOW()
                FROM "Structures" structure
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "StructureUsages" usage
                    WHERE usage."ProjectId" = structure."ProjectId"
                      AND usage."StructureId" = structure."Id"
                      AND usage."TargetKind" = 'project'
                      AND usage."TargetId" = structure."ProjectId"
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
