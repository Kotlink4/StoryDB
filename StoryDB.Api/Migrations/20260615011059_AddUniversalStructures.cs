using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniversalStructures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Structures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OwnerKind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    OwnerId = table.Column<int>(type: "integer", nullable: true),
                    LayoutKind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    NodeBindingMode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    LinkedCatalogId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Structures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Structures_Catalogs_LinkedCatalogId",
                        column: x => x.LinkedCatalogId,
                        principalTable: "Catalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Structures_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StructureNodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StructureId = table.Column<int>(type: "integer", nullable: false),
                    ParentNodeId = table.Column<int>(type: "integer", nullable: true),
                    LinkedCatalogEntryId = table.Column<int>(type: "integer", nullable: true),
                    LinkedCatalogEntryGroupId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NodeType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Color = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    IconKey = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    LevelIndex = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StructureNodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StructureNodes_CatalogEntries_LinkedCatalogEntryId",
                        column: x => x.LinkedCatalogEntryId,
                        principalTable: "CatalogEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StructureNodes_CatalogEntryGroups_LinkedCatalogEntryGroupId",
                        column: x => x.LinkedCatalogEntryGroupId,
                        principalTable: "CatalogEntryGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StructureNodes_StructureNodes_ParentNodeId",
                        column: x => x.ParentNodeId,
                        principalTable: "StructureNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StructureNodes_Structures_StructureId",
                        column: x => x.StructureId,
                        principalTable: "Structures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StructureEdges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StructureId = table.Column<int>(type: "integer", nullable: false),
                    SourceNodeId = table.Column<int>(type: "integer", nullable: false),
                    TargetNodeId = table.Column<int>(type: "integer", nullable: false),
                    RelationType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StructureEdges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StructureEdges_StructureNodes_SourceNodeId",
                        column: x => x.SourceNodeId,
                        principalTable: "StructureNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StructureEdges_StructureNodes_TargetNodeId",
                        column: x => x.TargetNodeId,
                        principalTable: "StructureNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StructureEdges_Structures_StructureId",
                        column: x => x.StructureId,
                        principalTable: "Structures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StructureEdges_SourceNodeId_TargetNodeId_RelationType",
                table: "StructureEdges",
                columns: new[] { "SourceNodeId", "TargetNodeId", "RelationType" });

            migrationBuilder.CreateIndex(
                name: "IX_StructureEdges_StructureId_SortOrder",
                table: "StructureEdges",
                columns: new[] { "StructureId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_StructureEdges_TargetNodeId",
                table: "StructureEdges",
                column: "TargetNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_StructureNodes_LinkedCatalogEntryGroupId",
                table: "StructureNodes",
                column: "LinkedCatalogEntryGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_StructureNodes_LinkedCatalogEntryId",
                table: "StructureNodes",
                column: "LinkedCatalogEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_StructureNodes_ParentNodeId",
                table: "StructureNodes",
                column: "ParentNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_StructureNodes_StructureId_LevelIndex_SortOrder",
                table: "StructureNodes",
                columns: new[] { "StructureId", "LevelIndex", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Structures_LinkedCatalogId",
                table: "Structures",
                column: "LinkedCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_Structures_ProjectId_Name",
                table: "Structures",
                columns: new[] { "ProjectId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Structures_ProjectId_OwnerKind_OwnerId",
                table: "Structures",
                columns: new[] { "ProjectId", "OwnerKind", "OwnerId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StructureEdges");

            migrationBuilder.DropTable(
                name: "StructureNodes");

            migrationBuilder.DropTable(
                name: "Structures");
        }
    }
}
