using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplatePackSummaryCounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AttributeCount",
                table: "ProjectTemplatePacks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CatalogCount",
                table: "ProjectTemplatePacks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StructureCount",
                table: "ProjectTemplatePacks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                """
                UPDATE "ProjectTemplatePacks"
                SET
                    "AttributeCount" = COALESCE(jsonb_array_length(("SnapshotJson"::jsonb) -> 'attributes'), 0),
                    "CatalogCount" = COALESCE(jsonb_array_length(("SnapshotJson"::jsonb) -> 'catalogs'), 0),
                    "StructureCount" = COALESCE(jsonb_array_length(("SnapshotJson"::jsonb) -> 'structures'), 0)
                WHERE "SnapshotJson" IS NOT NULL AND "SnapshotJson" <> '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttributeCount",
                table: "ProjectTemplatePacks");

            migrationBuilder.DropColumn(
                name: "CatalogCount",
                table: "ProjectTemplatePacks");

            migrationBuilder.DropColumn(
                name: "StructureCount",
                table: "ProjectTemplatePacks");
        }
    }
}
