using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectTemplatePacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Visibility",
                table: "Projects",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "private");

            migrationBuilder.CreateTable(
                name: "ProjectTemplatePacks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OwnerUserId = table.Column<int>(type: "integer", nullable: false),
                    SourceProjectId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    SnapshotJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTemplatePacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectTemplatePacks_Projects_SourceProjectId",
                        column: x => x.SourceProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectTemplatePacks_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectTemplatePackFavorites",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    TemplatePackId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTemplatePackFavorites", x => new { x.UserId, x.TemplatePackId });
                    table.ForeignKey(
                        name: "FK_ProjectTemplatePackFavorites_ProjectTemplatePacks_TemplateP~",
                        column: x => x.TemplatePackId,
                        principalTable: "ProjectTemplatePacks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectTemplatePackFavorites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_Visibility",
                table: "Projects",
                column: "Visibility");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTemplatePackFavorites_TemplatePackId",
                table: "ProjectTemplatePackFavorites",
                column: "TemplatePackId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTemplatePackFavorites_UserId_CreatedAt",
                table: "ProjectTemplatePackFavorites",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTemplatePacks_IsPublic_UpdatedAt",
                table: "ProjectTemplatePacks",
                columns: new[] { "IsPublic", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTemplatePacks_OwnerUserId_UpdatedAt",
                table: "ProjectTemplatePacks",
                columns: new[] { "OwnerUserId", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTemplatePacks_SourceProjectId",
                table: "ProjectTemplatePacks",
                column: "SourceProjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectTemplatePackFavorites");

            migrationBuilder.DropTable(
                name: "ProjectTemplatePacks");

            migrationBuilder.DropIndex(
                name: "IX_Projects_Visibility",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "Projects");
        }
    }
}
