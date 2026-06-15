using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationGraphLayoutGraphKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RelationGraphLayouts_ProjectId_OwnerUserId_IsDefault",
                table: "RelationGraphLayouts");

            migrationBuilder.AddColumn<string>(
                name: "GraphKey",
                table: "RelationGraphLayouts",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "relations:all");

            migrationBuilder.CreateIndex(
                name: "IX_RelationGraphLayouts_ProjectId_OwnerUserId_GraphKey_IsDefau~",
                table: "RelationGraphLayouts",
                columns: new[] { "ProjectId", "OwnerUserId", "GraphKey", "IsDefault" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RelationGraphLayouts_ProjectId_OwnerUserId_GraphKey_IsDefau~",
                table: "RelationGraphLayouts");

            migrationBuilder.DropColumn(
                name: "GraphKey",
                table: "RelationGraphLayouts");

            migrationBuilder.CreateIndex(
                name: "IX_RelationGraphLayouts_ProjectId_OwnerUserId_IsDefault",
                table: "RelationGraphLayouts",
                columns: new[] { "ProjectId", "OwnerUserId", "IsDefault" });
        }
    }
}
