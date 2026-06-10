using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CharacterRelationships",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceCharacterId = table.Column<int>(type: "integer", nullable: false),
                    TargetCharacterId = table.Column<int>(type: "integer", nullable: false),
                    RelationType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Strength = table.Column<int>(type: "integer", nullable: false),
                    Tension = table.Column<int>(type: "integer", nullable: false),
                    IsBidirectional = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterRelationships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CharacterRelationships_Objects_SourceCharacterId",
                        column: x => x.SourceCharacterId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CharacterRelationships_Objects_TargetCharacterId",
                        column: x => x.TargetCharacterId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CharacterRelationships_SourceCharacterId_TargetCharacterId_~",
                table: "CharacterRelationships",
                columns: new[] { "SourceCharacterId", "TargetCharacterId", "RelationType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CharacterRelationships_TargetCharacterId",
                table: "CharacterRelationships",
                column: "TargetCharacterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CharacterRelationships");
        }
    }
}
