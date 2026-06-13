using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaAssets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MediaAssets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OwnerUserId = table.Column<int>(type: "integer", nullable: true),
                    ProjectId = table.Column<int>(type: "integer", nullable: true),
                    OriginalFileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    StorageDirectory = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    OriginalPath = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    PublicPath = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsMigrated = table.Column<bool>(type: "boolean", nullable: false),
                    LegacyPath = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaAssets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaAssets_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MediaAssets_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MediaAssetVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MediaAssetId = table.Column<int>(type: "integer", nullable: false),
                    VariantKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Path = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaAssetVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaAssetVariants_MediaAssets_MediaAssetId",
                        column: x => x.MediaAssetId,
                        principalTable: "MediaAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_OwnerUserId",
                table: "MediaAssets",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_ProjectId_CreatedAt",
                table: "MediaAssets",
                columns: new[] { "ProjectId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_ProjectId_LegacyPath",
                table: "MediaAssets",
                columns: new[] { "ProjectId", "LegacyPath" });

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_Sha256",
                table: "MediaAssets",
                column: "Sha256");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssetVariants_MediaAssetId_VariantKey",
                table: "MediaAssetVariants",
                columns: new[] { "MediaAssetId", "VariantKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MediaAssetVariants");

            migrationBuilder.DropTable(
                name: "MediaAssets");
        }
    }
}
