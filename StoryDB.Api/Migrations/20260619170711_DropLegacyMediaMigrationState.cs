using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class DropLegacyMediaMigrationState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Users" target
                SET "AvatarImagePath" = asset."PublicPath"
                FROM "MediaAssets" asset
                WHERE target."AvatarImagePath" = asset."LegacyPath"
                  AND asset."ProjectId" IS NULL
                  AND asset."LegacyPath" IS NOT NULL;

                UPDATE "Projects" target
                SET "CoverImagePath" = asset."PublicPath"
                FROM "MediaAssets" asset
                WHERE target."CoverImagePath" = asset."LegacyPath"
                  AND asset."ProjectId" = target."Id"
                  AND asset."LegacyPath" IS NOT NULL;

                UPDATE "Objects" target
                SET "ImagePath" = asset."PublicPath"
                FROM "MediaAssets" asset
                WHERE target."ImagePath" = asset."LegacyPath"
                  AND asset."ProjectId" = target."ProjectId"
                  AND asset."LegacyPath" IS NOT NULL;

                UPDATE "ObjectGalleryImages" target
                SET "ImagePath" = asset."PublicPath"
                FROM "Objects" story_object, "MediaAssets" asset
                WHERE target."StoryObjectId" = story_object."Id"
                  AND target."ImagePath" = asset."LegacyPath"
                  AND asset."ProjectId" = story_object."ProjectId"
                  AND asset."LegacyPath" IS NOT NULL;

                UPDATE "TimelineEvents" target
                SET "ImagePath" = asset."PublicPath"
                FROM "MediaAssets" asset
                WHERE target."ImagePath" = asset."LegacyPath"
                  AND asset."ProjectId" = target."ProjectId"
                  AND asset."LegacyPath" IS NOT NULL;

                UPDATE "TimelineEventGalleryImages" target
                SET "ImagePath" = asset."PublicPath"
                FROM "TimelineEvents" timeline_event, "MediaAssets" asset
                WHERE target."TimelineEventId" = timeline_event."Id"
                  AND target."ImagePath" = asset."LegacyPath"
                  AND asset."ProjectId" = timeline_event."ProjectId"
                  AND asset."LegacyPath" IS NOT NULL;

                UPDATE "CatalogEntries" target
                SET "ImagePath" = asset."PublicPath"
                FROM "Catalogs" catalog, "MediaAssets" asset
                WHERE target."CatalogId" = catalog."Id"
                  AND target."ImagePath" = asset."LegacyPath"
                  AND asset."ProjectId" = catalog."ProjectId"
                  AND asset."LegacyPath" IS NOT NULL;
                """);

            migrationBuilder.DropIndex(
                name: "IX_MediaAssets_ProjectId_LegacyPath",
                table: "MediaAssets");

            migrationBuilder.DropColumn(
                name: "IsMigrated",
                table: "MediaAssets");

            migrationBuilder.DropColumn(
                name: "LegacyPath",
                table: "MediaAssets");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsMigrated",
                table: "MediaAssets",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LegacyPath",
                table: "MediaAssets",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_ProjectId_LegacyPath",
                table: "MediaAssets",
                columns: new[] { "ProjectId", "LegacyPath" });
        }
    }
}
