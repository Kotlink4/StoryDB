using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakeRelationGraphLayoutsNodeBased : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RelationGraphLayoutItems_Objects_StoryObjectId",
                table: "RelationGraphLayoutItems");

            migrationBuilder.DropIndex(
                name: "IX_RelationGraphLayoutItems_StoryObjectId",
                table: "RelationGraphLayoutItems");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_RelationGraphLayoutItems_StoryObjectId",
                table: "RelationGraphLayoutItems",
                column: "StoryObjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_RelationGraphLayoutItems_Objects_StoryObjectId",
                table: "RelationGraphLayoutItems",
                column: "StoryObjectId",
                principalTable: "Objects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
