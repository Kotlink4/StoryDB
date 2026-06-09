using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Catalogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false),
                    SupportsHierarchy = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Catalogs_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CatalogEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CatalogId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ImagePath = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogEntries_Catalogs_CatalogId",
                        column: x => x.CatalogId,
                        principalTable: "Catalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CatalogFieldGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CatalogId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogFieldGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogFieldGroups_Catalogs_CatalogId",
                        column: x => x.CatalogId,
                        principalTable: "Catalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CatalogEntryHierarchyLinks",
                columns: table => new
                {
                    ParentEntryId = table.Column<int>(type: "integer", nullable: false),
                    ChildEntryId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogEntryHierarchyLinks", x => new { x.ParentEntryId, x.ChildEntryId });
                    table.ForeignKey(
                        name: "FK_CatalogEntryHierarchyLinks_CatalogEntries_ChildEntryId",
                        column: x => x.ChildEntryId,
                        principalTable: "CatalogEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CatalogEntryHierarchyLinks_CatalogEntries_ParentEntryId",
                        column: x => x.ParentEntryId,
                        principalTable: "CatalogEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CatalogFieldDefinitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CatalogId = table.Column<int>(type: "integer", nullable: false),
                    FieldGroupId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    DataType = table.Column<string>(type: "text", nullable: false),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false),
                    MinValue = table.Column<double>(type: "double precision", nullable: true),
                    MaxValue = table.Column<double>(type: "double precision", nullable: true),
                    OptionsJson = table.Column<string>(type: "text", nullable: true),
                    ReferenceCatalogId = table.Column<int>(type: "integer", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogFieldDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogFieldDefinitions_CatalogFieldGroups_FieldGroupId",
                        column: x => x.FieldGroupId,
                        principalTable: "CatalogFieldGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CatalogFieldDefinitions_Catalogs_CatalogId",
                        column: x => x.CatalogId,
                        principalTable: "Catalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CatalogFieldDefinitions_Catalogs_ReferenceCatalogId",
                        column: x => x.ReferenceCatalogId,
                        principalTable: "Catalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CatalogEntryFieldValues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CatalogEntryId = table.Column<int>(type: "integer", nullable: false),
                    FieldDefinitionId = table.Column<int>(type: "integer", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true),
                    ReferencedEntryId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogEntryFieldValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogEntryFieldValues_CatalogEntries_CatalogEntryId",
                        column: x => x.CatalogEntryId,
                        principalTable: "CatalogEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CatalogEntryFieldValues_CatalogEntries_ReferencedEntryId",
                        column: x => x.ReferencedEntryId,
                        principalTable: "CatalogEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CatalogEntryFieldValues_CatalogFieldDefinitions_FieldDefini~",
                        column: x => x.FieldDefinitionId,
                        principalTable: "CatalogFieldDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntries_CatalogId_Name",
                table: "CatalogEntries",
                columns: new[] { "CatalogId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntryFieldValues_CatalogEntryId_FieldDefinitionId_Re~",
                table: "CatalogEntryFieldValues",
                columns: new[] { "CatalogEntryId", "FieldDefinitionId", "ReferencedEntryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntryFieldValues_FieldDefinitionId",
                table: "CatalogEntryFieldValues",
                column: "FieldDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntryFieldValues_ReferencedEntryId",
                table: "CatalogEntryFieldValues",
                column: "ReferencedEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntryHierarchyLinks_ChildEntryId",
                table: "CatalogEntryHierarchyLinks",
                column: "ChildEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogFieldDefinitions_CatalogId_Name",
                table: "CatalogFieldDefinitions",
                columns: new[] { "CatalogId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CatalogFieldDefinitions_FieldGroupId",
                table: "CatalogFieldDefinitions",
                column: "FieldGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogFieldDefinitions_ReferenceCatalogId",
                table: "CatalogFieldDefinitions",
                column: "ReferenceCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogFieldGroups_CatalogId_Name",
                table: "CatalogFieldGroups",
                columns: new[] { "CatalogId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Catalogs_ProjectId_Key",
                table: "Catalogs",
                columns: new[] { "ProjectId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Catalogs_ProjectId_Name",
                table: "Catalogs",
                columns: new[] { "ProjectId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CatalogEntryFieldValues");

            migrationBuilder.DropTable(
                name: "CatalogEntryHierarchyLinks");

            migrationBuilder.DropTable(
                name: "CatalogFieldDefinitions");

            migrationBuilder.DropTable(
                name: "CatalogEntries");

            migrationBuilder.DropTable(
                name: "CatalogFieldGroups");

            migrationBuilder.DropTable(
                name: "Catalogs");
        }
    }
}
