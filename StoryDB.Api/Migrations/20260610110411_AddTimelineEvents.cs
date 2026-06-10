using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTimelineEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TimelineEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    StartLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    EndLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    StartValue = table.Column<decimal>(type: "numeric", nullable: true),
                    EndValue = table.Column<decimal>(type: "numeric", nullable: true),
                    Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Color = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineEvents_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimelineChanges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TimelineEventId = table.Column<int>(type: "integer", nullable: false),
                    ChangeType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    TargetType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    TargetId = table.Column<int>(type: "integer", nullable: false),
                    FieldKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    FieldName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    OldValueJson = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    NewValueJson = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    EffectiveFromLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    EffectiveToLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    EffectiveFromValue = table.Column<decimal>(type: "numeric", nullable: true),
                    EffectiveToValue = table.Column<decimal>(type: "numeric", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineChanges_TimelineEvents_TimelineEventId",
                        column: x => x.TimelineEventId,
                        principalTable: "TimelineEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimelineParticipants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TimelineEventId = table.Column<int>(type: "integer", nullable: false),
                    TargetType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    TargetId = table.Column<int>(type: "integer", nullable: false),
                    Role = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineParticipants_TimelineEvents_TimelineEventId",
                        column: x => x.TimelineEventId,
                        principalTable: "TimelineEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineChanges_TimelineEventId_TargetType_TargetId",
                table: "TimelineChanges",
                columns: new[] { "TimelineEventId", "TargetType", "TargetId" });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEvents_ProjectId_StartValue_SortOrder",
                table: "TimelineEvents",
                columns: new[] { "ProjectId", "StartValue", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineParticipants_TimelineEventId_TargetType_TargetId",
                table: "TimelineParticipants",
                columns: new[] { "TimelineEventId", "TargetType", "TargetId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TimelineChanges");

            migrationBuilder.DropTable(
                name: "TimelineParticipants");

            migrationBuilder.DropTable(
                name: "TimelineEvents");
        }
    }
}
