using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStoryObjectHierarchySelections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StoryObjectHierarchySelections",
                columns: table => new
                {
                    StoryObjectId = table.Column<int>(type: "integer", nullable: false),
                    HierarchyGroupId = table.Column<int>(type: "integer", nullable: false),
                    HierarchyNodeId = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoryObjectHierarchySelections", x => new { x.StoryObjectId, x.HierarchyGroupId, x.HierarchyNodeId });
                    table.ForeignKey(
                        name: "FK_StoryObjectHierarchySelections_HierarchyGroups_HierarchyGro~",
                        column: x => x.HierarchyGroupId,
                        principalTable: "HierarchyGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StoryObjectHierarchySelections_HierarchyNodes_HierarchyNode~",
                        column: x => x.HierarchyNodeId,
                        principalTable: "HierarchyNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StoryObjectHierarchySelections_Objects_StoryObjectId",
                        column: x => x.StoryObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectHierarchySelections_HierarchyGroupId",
                table: "StoryObjectHierarchySelections",
                column: "HierarchyGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectHierarchySelections_HierarchyNodeId",
                table: "StoryObjectHierarchySelections",
                column: "HierarchyNodeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoryObjectHierarchySelections");
        }
    }
}
