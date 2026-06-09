using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogEntryGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EntryGroupId",
                table: "CatalogEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CatalogEntryGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CatalogId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogEntryGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogEntryGroups_Catalogs_CatalogId",
                        column: x => x.CatalogId,
                        principalTable: "Catalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntries_EntryGroupId",
                table: "CatalogEntries",
                column: "EntryGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntryGroups_CatalogId_Name",
                table: "CatalogEntryGroups",
                columns: new[] { "CatalogId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogEntries_CatalogEntryGroups_EntryGroupId",
                table: "CatalogEntries",
                column: "EntryGroupId",
                principalTable: "CatalogEntryGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CatalogEntries_CatalogEntryGroups_EntryGroupId",
                table: "CatalogEntries");

            migrationBuilder.DropTable(
                name: "CatalogEntryGroups");

            migrationBuilder.DropIndex(
                name: "IX_CatalogEntries_EntryGroupId",
                table: "CatalogEntries");

            migrationBuilder.DropColumn(
                name: "EntryGroupId",
                table: "CatalogEntries");
        }
    }
}
