using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStoryObjectCatalogSelections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StoryObjectCatalogSelections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StoryObjectId = table.Column<int>(type: "integer", nullable: false),
                    TargetType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CatalogId = table.Column<int>(type: "integer", nullable: false),
                    CatalogEntryGroupId = table.Column<int>(type: "integer", nullable: true),
                    CatalogEntryId = table.Column<int>(type: "integer", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoryObjectCatalogSelections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoryObjectCatalogSelections_CatalogEntries_CatalogEntryId",
                        column: x => x.CatalogEntryId,
                        principalTable: "CatalogEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StoryObjectCatalogSelections_CatalogEntryGroups_CatalogEntr~",
                        column: x => x.CatalogEntryGroupId,
                        principalTable: "CatalogEntryGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StoryObjectCatalogSelections_Catalogs_CatalogId",
                        column: x => x.CatalogId,
                        principalTable: "Catalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StoryObjectCatalogSelections_Objects_StoryObjectId",
                        column: x => x.StoryObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectCatalogSelections_CatalogEntryGroupId",
                table: "StoryObjectCatalogSelections",
                column: "CatalogEntryGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectCatalogSelections_CatalogEntryId",
                table: "StoryObjectCatalogSelections",
                column: "CatalogEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectCatalogSelections_CatalogId",
                table: "StoryObjectCatalogSelections",
                column: "CatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectCatalogSelections_StoryObjectId_TargetType_Catal~",
                table: "StoryObjectCatalogSelections",
                columns: new[] { "StoryObjectId", "TargetType", "CatalogId", "CatalogEntryGroupId", "CatalogEntryId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoryObjectCatalogSelections");
        }
    }
}
