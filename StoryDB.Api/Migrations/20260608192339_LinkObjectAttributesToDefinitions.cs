using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class LinkObjectAttributesToDefinitions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ObjectAttributes_StoryObjectId",
                table: "ObjectAttributes");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "ObjectAttributes");

            migrationBuilder.AddColumn<int>(
                name: "AttributeDefinitionId",
                table: "ObjectAttributes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ObjectAttributes_AttributeDefinitionId",
                table: "ObjectAttributes",
                column: "AttributeDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectAttributes_StoryObjectId_AttributeDefinitionId",
                table: "ObjectAttributes",
                columns: new[] { "StoryObjectId", "AttributeDefinitionId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ObjectAttributes_AttributeDefinitions_AttributeDefinitionId",
                table: "ObjectAttributes",
                column: "AttributeDefinitionId",
                principalTable: "AttributeDefinitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ObjectAttributes_AttributeDefinitions_AttributeDefinitionId",
                table: "ObjectAttributes");

            migrationBuilder.DropIndex(
                name: "IX_ObjectAttributes_AttributeDefinitionId",
                table: "ObjectAttributes");

            migrationBuilder.DropIndex(
                name: "IX_ObjectAttributes_StoryObjectId_AttributeDefinitionId",
                table: "ObjectAttributes");

            migrationBuilder.DropColumn(
                name: "AttributeDefinitionId",
                table: "ObjectAttributes");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "ObjectAttributes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectAttributes_StoryObjectId",
                table: "ObjectAttributes",
                column: "StoryObjectId");
        }
    }
}
