using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class MigrateLegacyOrganizationStructures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TEMP TABLE "LegacyOrganizationStructureMap" (
                    "OrganizationObjectId" integer NOT NULL,
                    "StructureId" integer NOT NULL
                ) ON COMMIT DROP;

                INSERT INTO "Structures"
                    ("ProjectId", "Name", "Description", "OwnerKind", "OwnerId", "ApplicationScope", "LayoutKind",
                     "NodeBindingMode", "CatalogSyncMode", "LinkedCatalogId", "CreatedAt", "UpdatedAt")
                SELECT
                    organization."ProjectId",
                    left(organization."Name" || ' - Structure', 160),
                    'Migrated from legacy organization structure.',
                    'object',
                    organization."Id",
                    'organizations',
                    'levels',
                    'none',
                    'manual',
                    NULL,
                    NOW(),
                    NOW()
                FROM "Objects" organization
                WHERE EXISTS (
                    SELECT 1
                    FROM "OrganizationStructureLevels" level
                    WHERE level."OrganizationObjectId" = organization."Id"
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM "Structures" structure
                    WHERE structure."ProjectId" = organization."ProjectId"
                      AND structure."OwnerKind" = 'object'
                      AND structure."OwnerId" = organization."Id"
                      AND structure."ApplicationScope" = 'organizations'
                );

                INSERT INTO "LegacyOrganizationStructureMap" ("OrganizationObjectId", "StructureId")
                SELECT organization."Id", structure."Id"
                FROM "Objects" organization
                JOIN "Structures" structure
                  ON structure."ProjectId" = organization."ProjectId"
                 AND structure."OwnerKind" = 'object'
                 AND structure."OwnerId" = organization."Id"
                 AND structure."ApplicationScope" = 'organizations'
                WHERE EXISTS (
                    SELECT 1
                    FROM "OrganizationStructureLevels" level
                    WHERE level."OrganizationObjectId" = organization."Id"
                );

                INSERT INTO "StructureUsages"
                    ("ProjectId", "StructureId", "TargetKind", "TargetId", "DisplayName", "Notes", "IsPrimary", "CreatedAt", "UpdatedAt")
                SELECT
                    organization."ProjectId",
                    map."StructureId",
                    'project',
                    organization."ProjectId",
                    NULL,
                    NULL,
                    FALSE,
                    NOW(),
                    NOW()
                FROM "LegacyOrganizationStructureMap" map
                JOIN "Objects" organization ON organization."Id" = map."OrganizationObjectId"
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "StructureUsages" usage
                    WHERE usage."ProjectId" = organization."ProjectId"
                      AND usage."StructureId" = map."StructureId"
                      AND usage."TargetKind" = 'project'
                      AND usage."TargetId" = organization."ProjectId"
                );

                INSERT INTO "StructureUsages"
                    ("ProjectId", "StructureId", "TargetKind", "TargetId", "DisplayName", "Notes", "IsPrimary", "CreatedAt", "UpdatedAt")
                SELECT
                    organization."ProjectId",
                    map."StructureId",
                    'object',
                    organization."Id",
                    NULL,
                    'Migrated from legacy organization structure.',
                    NOT EXISTS (
                        SELECT 1
                        FROM "StructureUsages" existing
                        WHERE existing."ProjectId" = organization."ProjectId"
                          AND existing."TargetKind" = 'object'
                          AND existing."TargetId" = organization."Id"
                          AND existing."IsPrimary"
                    ),
                    NOW(),
                    NOW()
                FROM "LegacyOrganizationStructureMap" map
                JOIN "Objects" organization ON organization."Id" = map."OrganizationObjectId"
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "StructureUsages" usage
                    WHERE usage."ProjectId" = organization."ProjectId"
                      AND usage."StructureId" = map."StructureId"
                      AND usage."TargetKind" = 'object'
                      AND usage."TargetId" = organization."Id"
                );

                INSERT INTO "StructureNodes"
                    ("StructureId", "ParentNodeId", "LinkedCatalogEntryId", "LinkedCatalogEntryGroupId", "Name",
                     "Description", "NodeType", "Color", "IconKey", "LevelIndex", "SortOrder", "CreatedAt", "UpdatedAt")
                SELECT
                    map."StructureId",
                    NULL,
                    NULL,
                    NULL,
                    slot."Name",
                    COALESCE(slot."Description", level."Description"),
                    COALESCE(slot."SlotType", level."Name"),
                    slot."Color",
                    slot."IconKey",
                    (
                        SELECT count(*)::integer
                        FROM "OrganizationStructureLevels" ordered_level
                        WHERE ordered_level."OrganizationObjectId" = level."OrganizationObjectId"
                          AND (
                              ordered_level."SortOrder" < level."SortOrder" OR
                              (ordered_level."SortOrder" = level."SortOrder" AND ordered_level."Id" < level."Id")
                          )
                    ),
                    slot."SortOrder",
                    COALESCE(slot."CreatedAt", level."CreatedAt", NOW()),
                    NOW()
                FROM "OrganizationStructureLevels" level
                JOIN "LegacyOrganizationStructureMap" map ON map."OrganizationObjectId" = level."OrganizationObjectId"
                JOIN "OrganizationStructureSlots" slot ON slot."OrganizationStructureLevelId" = level."Id"
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "StructureNodes" node
                    WHERE node."StructureId" = map."StructureId"
                      AND node."Name" = slot."Name"
                      AND node."LevelIndex" = (
                          SELECT count(*)::integer
                          FROM "OrganizationStructureLevels" ordered_level
                          WHERE ordered_level."OrganizationObjectId" = level."OrganizationObjectId"
                            AND (
                                ordered_level."SortOrder" < level."SortOrder" OR
                                (ordered_level."SortOrder" = level."SortOrder" AND ordered_level."Id" < level."Id")
                            )
                      )
                      AND node."SortOrder" = slot."SortOrder"
                );

                INSERT INTO "StructureNodes"
                    ("StructureId", "ParentNodeId", "LinkedCatalogEntryId", "LinkedCatalogEntryGroupId", "Name",
                     "Description", "NodeType", "Color", "IconKey", "LevelIndex", "SortOrder", "CreatedAt", "UpdatedAt")
                SELECT
                    map."StructureId",
                    NULL,
                    NULL,
                    NULL,
                    level."Name",
                    level."Description",
                    'Level',
                    NULL,
                    NULL,
                    (
                        SELECT count(*)::integer
                        FROM "OrganizationStructureLevels" ordered_level
                        WHERE ordered_level."OrganizationObjectId" = level."OrganizationObjectId"
                          AND (
                              ordered_level."SortOrder" < level."SortOrder" OR
                              (ordered_level."SortOrder" = level."SortOrder" AND ordered_level."Id" < level."Id")
                          )
                    ),
                    level."SortOrder",
                    COALESCE(level."CreatedAt", NOW()),
                    NOW()
                FROM "OrganizationStructureLevels" level
                JOIN "LegacyOrganizationStructureMap" map ON map."OrganizationObjectId" = level."OrganizationObjectId"
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "OrganizationStructureSlots" slot
                    WHERE slot."OrganizationStructureLevelId" = level."Id"
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM "StructureNodes" node
                    WHERE node."StructureId" = map."StructureId"
                      AND node."Name" = level."Name"
                      AND node."LevelIndex" = (
                          SELECT count(*)::integer
                          FROM "OrganizationStructureLevels" ordered_level
                          WHERE ordered_level."OrganizationObjectId" = level."OrganizationObjectId"
                            AND (
                                ordered_level."SortOrder" < level."SortOrder" OR
                                (ordered_level."SortOrder" = level."SortOrder" AND ordered_level."Id" < level."Id")
                            )
                      )
                      AND node."SortOrder" = level."SortOrder"
                );
                """);

            migrationBuilder.DropTable(
                name: "OrganizationStructureSlots");

            migrationBuilder.DropTable(
                name: "OrganizationStructureLevels");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganizationStructureLevels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrganizationObjectId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationStructureLevels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationStructureLevels_Objects_OrganizationObjectId",
                        column: x => x.OrganizationObjectId,
                        principalTable: "Objects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationStructureSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrganizationStructureLevelId = table.Column<int>(type: "integer", nullable: false),
                    Color = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IconKey = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    SlotType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationStructureSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationStructureSlots_OrganizationStructureLevels_Orga~",
                        column: x => x.OrganizationStructureLevelId,
                        principalTable: "OrganizationStructureLevels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationStructureLevels_OrganizationObjectId_SortOrder",
                table: "OrganizationStructureLevels",
                columns: new[] { "OrganizationObjectId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationStructureSlots_OrganizationStructureLevelId_Sor~",
                table: "OrganizationStructureSlots",
                columns: new[] { "OrganizationStructureLevelId", "SortOrder" });
        }
    }
}
