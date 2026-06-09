using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogHierarchyModes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HierarchyMode",
                table: "Catalogs",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "entries");

            migrationBuilder.CreateTable(
                name: "CatalogEntryGroupHierarchyLinks",
                columns: table => new
                {
                    ParentGroupId = table.Column<int>(type: "integer", nullable: false),
                    ChildGroupId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogEntryGroupHierarchyLinks", x => new { x.ParentGroupId, x.ChildGroupId });
                    table.ForeignKey(
                        name: "FK_CatalogEntryGroupHierarchyLinks_CatalogEntryGroups_ChildGro~",
                        column: x => x.ChildGroupId,
                        principalTable: "CatalogEntryGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CatalogEntryGroupHierarchyLinks_CatalogEntryGroups_ParentGr~",
                        column: x => x.ParentGroupId,
                        principalTable: "CatalogEntryGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntryGroupHierarchyLinks_ChildGroupId",
                table: "CatalogEntryGroupHierarchyLinks",
                column: "ChildGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CatalogEntryGroupHierarchyLinks");

            migrationBuilder.DropColumn(
                name: "HierarchyMode",
                table: "Catalogs");
        }
    }
}
