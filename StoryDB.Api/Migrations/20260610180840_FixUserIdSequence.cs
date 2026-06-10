using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixUserIdSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                SELECT setval(
                    pg_get_serial_sequence('"Users"', 'Id'),
                    GREATEST(COALESCE((SELECT MAX("Id") FROM "Users"), 1), 1),
                    true
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
