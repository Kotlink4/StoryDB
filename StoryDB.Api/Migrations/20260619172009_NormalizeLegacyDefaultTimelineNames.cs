using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeLegacyDefaultTimelineNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Timelines"
                SET "Name" = 'Основной таймлайн'
                WHERE "Name" = 'РћСЃРЅРѕРІРЅРѕР№ С‚Р°Р№РјР»Р°Р№РЅ'
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Timelines"
                SET "Name" = 'РћСЃРЅРѕРІРЅРѕР№ С‚Р°Р№РјР»Р°Р№РЅ'
                WHERE "Name" = 'Основной таймлайн' AND "IsDefault" = TRUE
                """);
        }
    }
}
