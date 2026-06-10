using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakeCharacterRelationshipsNonUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CharacterRelationships_SourceCharacterId_TargetCharacterId_~",
                table: "CharacterRelationships");

            migrationBuilder.CreateIndex(
                name: "IX_CharacterRelationships_SourceCharacterId_TargetCharacterId_~",
                table: "CharacterRelationships",
                columns: new[] { "SourceCharacterId", "TargetCharacterId", "RelationType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CharacterRelationships_SourceCharacterId_TargetCharacterId_~",
                table: "CharacterRelationships");

            migrationBuilder.CreateIndex(
                name: "IX_CharacterRelationships_SourceCharacterId_TargetCharacterId_~",
                table: "CharacterRelationships",
                columns: new[] { "SourceCharacterId", "TargetCharacterId", "RelationType" },
                unique: true);
        }
    }
}
