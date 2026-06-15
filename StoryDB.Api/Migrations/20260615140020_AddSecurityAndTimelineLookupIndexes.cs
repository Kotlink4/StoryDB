using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityAndTimelineLookupIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_TimelineParticipants_TargetType_TargetId_TimelineEventId",
                table: "TimelineParticipants",
                columns: new[] { "TargetType", "TargetId", "TimelineEventId" });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineChanges_TargetType_TargetId_TimelineEventId",
                table: "TimelineChanges",
                columns: new[] { "TargetType", "TargetId", "TimelineEventId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TimelineParticipants_TargetType_TargetId_TimelineEventId",
                table: "TimelineParticipants");

            migrationBuilder.DropIndex(
                name: "IX_TimelineChanges_TargetType_TargetId_TimelineEventId",
                table: "TimelineChanges");
        }
    }
}
