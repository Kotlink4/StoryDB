using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationGraphLayouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RelationGraphLayouts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    OwnerUserId = table.Column<int>(type: "integer", nullable: true),
                    AlgorithmVersion = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsStale = table.Column<bool>(type: "boolean", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelationGraphLayouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelationGraphLayouts_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RelationGraphLayouts_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RelationGraphLayoutItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RelationGraphLayoutId = table.Column<int>(type: "integer", nullable: false),
                    StoryObjectId = table.Column<int>(type: "integer", nullable: false),
                    X = table.Column<decimal>(type: "numeric", nullable: false),
                    Y = table.Column<decimal>(type: "numeric", nullable: false),
                    Width = table.Column<decimal>(type: "numeric", nullable: false),
                    Height = table.Column<decimal>(type: "numeric", nullable: false),
                    IsPinned = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelationGraphLayoutItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelationGraphLayoutItems_Objects_StoryObjectId",
                        column: x => x.StoryObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RelationGraphLayoutItems_RelationGraphLayouts_RelationGraph~",
                        column: x => x.RelationGraphLayoutId,
                        principalTable: "RelationGraphLayouts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RelationGraphLayoutItems_RelationGraphLayoutId_StoryObjectId",
                table: "RelationGraphLayoutItems",
                columns: new[] { "RelationGraphLayoutId", "StoryObjectId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RelationGraphLayoutItems_StoryObjectId",
                table: "RelationGraphLayoutItems",
                column: "StoryObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_RelationGraphLayouts_OwnerUserId",
                table: "RelationGraphLayouts",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RelationGraphLayouts_ProjectId_OwnerUserId_IsDefault",
                table: "RelationGraphLayouts",
                columns: new[] { "ProjectId", "OwnerUserId", "IsDefault" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RelationGraphLayoutItems");

            migrationBuilder.DropTable(
                name: "RelationGraphLayouts");
        }
    }
}
