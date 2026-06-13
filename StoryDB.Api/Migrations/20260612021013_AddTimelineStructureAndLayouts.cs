using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTimelineStructureAndLayouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM \"TimelineEvents\";");

            migrationBuilder.AddColumn<string>(
                name: "EventType",
                table: "TimelineEvents",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "point");

            migrationBuilder.AddColumn<int>(
                name: "ParentEventId",
                table: "TimelineEvents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TimelineId",
                table: "TimelineEvents",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Timelines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Mode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValue: "chapters"),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Timelines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Timelines_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimelineEventLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TimelineId = table.Column<int>(type: "integer", nullable: false),
                    SourceEventId = table.Column<int>(type: "integer", nullable: false),
                    TargetEventId = table.Column<int>(type: "integer", nullable: false),
                    LinkType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineEventLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineEventLinks_TimelineEvents_SourceEventId",
                        column: x => x.SourceEventId,
                        principalTable: "TimelineEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimelineEventLinks_TimelineEvents_TargetEventId",
                        column: x => x.TargetEventId,
                        principalTable: "TimelineEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimelineEventLinks_Timelines_TimelineId",
                        column: x => x.TimelineId,
                        principalTable: "Timelines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimelineLayouts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TimelineId = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_TimelineLayouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineLayouts_Timelines_TimelineId",
                        column: x => x.TimelineId,
                        principalTable: "Timelines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimelineLayouts_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TimelineLayoutItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TimelineLayoutId = table.Column<int>(type: "integer", nullable: false),
                    TimelineEventId = table.Column<int>(type: "integer", nullable: false),
                    X = table.Column<decimal>(type: "numeric", nullable: false),
                    Y = table.Column<decimal>(type: "numeric", nullable: false),
                    Width = table.Column<decimal>(type: "numeric", nullable: false),
                    Height = table.Column<decimal>(type: "numeric", nullable: false),
                    Lane = table.Column<int>(type: "integer", nullable: false),
                    Layer = table.Column<int>(type: "integer", nullable: false),
                    IsPinned = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineLayoutItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineLayoutItems_TimelineEvents_TimelineEventId",
                        column: x => x.TimelineEventId,
                        principalTable: "TimelineEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimelineLayoutItems_TimelineLayouts_TimelineLayoutId",
                        column: x => x.TimelineLayoutId,
                        principalTable: "TimelineLayouts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEvents_ParentEventId",
                table: "TimelineEvents",
                column: "ParentEventId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEvents_TimelineId_StartValue_SortOrder",
                table: "TimelineEvents",
                columns: new[] { "TimelineId", "StartValue", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEventLinks_SourceEventId",
                table: "TimelineEventLinks",
                column: "SourceEventId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEventLinks_TargetEventId",
                table: "TimelineEventLinks",
                column: "TargetEventId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEventLinks_TimelineId_SourceEventId_TargetEventId_L~",
                table: "TimelineEventLinks",
                columns: new[] { "TimelineId", "SourceEventId", "TargetEventId", "LinkType" });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineLayoutItems_TimelineEventId",
                table: "TimelineLayoutItems",
                column: "TimelineEventId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineLayoutItems_TimelineLayoutId_TimelineEventId",
                table: "TimelineLayoutItems",
                columns: new[] { "TimelineLayoutId", "TimelineEventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimelineLayouts_OwnerUserId",
                table: "TimelineLayouts",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineLayouts_TimelineId_OwnerUserId_IsDefault",
                table: "TimelineLayouts",
                columns: new[] { "TimelineId", "OwnerUserId", "IsDefault" });

            migrationBuilder.CreateIndex(
                name: "IX_Timelines_ProjectId_IsDefault",
                table: "Timelines",
                columns: new[] { "ProjectId", "IsDefault" });

            migrationBuilder.CreateIndex(
                name: "IX_Timelines_ProjectId_Name",
                table: "Timelines",
                columns: new[] { "ProjectId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TimelineEvents_TimelineEvents_ParentEventId",
                table: "TimelineEvents",
                column: "ParentEventId",
                principalTable: "TimelineEvents",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TimelineEvents_Timelines_TimelineId",
                table: "TimelineEvents",
                column: "TimelineId",
                principalTable: "Timelines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimelineEvents_TimelineEvents_ParentEventId",
                table: "TimelineEvents");

            migrationBuilder.DropForeignKey(
                name: "FK_TimelineEvents_Timelines_TimelineId",
                table: "TimelineEvents");

            migrationBuilder.DropTable(
                name: "TimelineEventLinks");

            migrationBuilder.DropTable(
                name: "TimelineLayoutItems");

            migrationBuilder.DropTable(
                name: "TimelineLayouts");

            migrationBuilder.DropTable(
                name: "Timelines");

            migrationBuilder.DropIndex(
                name: "IX_TimelineEvents_ParentEventId",
                table: "TimelineEvents");

            migrationBuilder.DropIndex(
                name: "IX_TimelineEvents_TimelineId_StartValue_SortOrder",
                table: "TimelineEvents");

            migrationBuilder.DropColumn(
                name: "EventType",
                table: "TimelineEvents");

            migrationBuilder.DropColumn(
                name: "ParentEventId",
                table: "TimelineEvents");

            migrationBuilder.DropColumn(
                name: "TimelineId",
                table: "TimelineEvents");
        }
    }
}
