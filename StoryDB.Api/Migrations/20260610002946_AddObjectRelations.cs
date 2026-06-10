using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddObjectRelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ObjectRelations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceObjectId = table.Column<int>(type: "integer", nullable: false),
                    TargetObjectId = table.Column<int>(type: "integer", nullable: false),
                    RelationType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObjectRelations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ObjectRelations_Objects_SourceObjectId",
                        column: x => x.SourceObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ObjectRelations_Objects_TargetObjectId",
                        column: x => x.TargetObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ObjectRelations_SourceObjectId_RelationType_TargetObjectId",
                table: "ObjectRelations",
                columns: new[] { "SourceObjectId", "RelationType", "TargetObjectId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ObjectRelations_TargetObjectId",
                table: "ObjectRelations",
                column: "TargetObjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ObjectRelations");
        }
    }
}
