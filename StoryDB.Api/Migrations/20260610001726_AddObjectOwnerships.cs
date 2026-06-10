using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddObjectOwnerships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ObjectOwnerships",
                columns: table => new
                {
                    OwnerCharacterId = table.Column<int>(type: "integer", nullable: false),
                    ItemObjectId = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObjectOwnerships", x => new { x.OwnerCharacterId, x.ItemObjectId });
                    table.ForeignKey(
                        name: "FK_ObjectOwnerships_Objects_ItemObjectId",
                        column: x => x.ItemObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ObjectOwnerships_Objects_OwnerCharacterId",
                        column: x => x.OwnerCharacterId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ObjectOwnerships_ItemObjectId",
                table: "ObjectOwnerships",
                column: "ItemObjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ObjectOwnerships");
        }
    }
}
