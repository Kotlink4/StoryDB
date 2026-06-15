using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStructureAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StructureAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    StructureUsageId = table.Column<int>(type: "integer", nullable: false),
                    StructureNodeId = table.Column<int>(type: "integer", nullable: false),
                    StoryObjectId = table.Column<int>(type: "integer", nullable: false),
                    RoleLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StructureAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StructureAssignments_Objects_StoryObjectId",
                        column: x => x.StoryObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StructureAssignments_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StructureAssignments_StructureNodes_StructureNodeId",
                        column: x => x.StructureNodeId,
                        principalTable: "StructureNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StructureAssignments_StructureUsages_StructureUsageId",
                        column: x => x.StructureUsageId,
                        principalTable: "StructureUsages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StructureAssignments_ProjectId_StoryObjectId",
                table: "StructureAssignments",
                columns: new[] { "ProjectId", "StoryObjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_StructureAssignments_StoryObjectId",
                table: "StructureAssignments",
                column: "StoryObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_StructureAssignments_StructureNodeId",
                table: "StructureAssignments",
                column: "StructureNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_StructureAssignments_StructureUsageId_StructureNodeId_SortO~",
                table: "StructureAssignments",
                columns: new[] { "StructureUsageId", "StructureNodeId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_StructureAssignments_StructureUsageId_StructureNodeId_Story~",
                table: "StructureAssignments",
                columns: new[] { "StructureUsageId", "StructureNodeId", "StoryObjectId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StructureAssignments");
        }
    }
}
