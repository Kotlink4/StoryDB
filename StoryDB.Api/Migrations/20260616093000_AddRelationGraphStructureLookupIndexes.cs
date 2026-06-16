using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StoryDB.Api.Data;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(StoryDbContext))]
    [Migration("20260616093000_AddRelationGraphStructureLookupIndexes")]
    public partial class AddRelationGraphStructureLookupIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_StructureAssignments_ProjectId_StoryObjectId_StructureUsa~",
                table: "StructureAssignments",
                columns: new[] { "ProjectId", "StoryObjectId", "StructureUsageId" });

            migrationBuilder.CreateIndex(
                name: "IX_StructureAssignments_ProjectId_StructureUsageId_Structure~",
                table: "StructureAssignments",
                columns: new[] { "ProjectId", "StructureUsageId", "StructureNodeId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_StructureUsages_ProjectId_StructureId_TargetKind",
                table: "StructureUsages",
                columns: new[] { "ProjectId", "StructureId", "TargetKind" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StructureAssignments_ProjectId_StoryObjectId_StructureUsa~",
                table: "StructureAssignments");

            migrationBuilder.DropIndex(
                name: "IX_StructureAssignments_ProjectId_StructureUsageId_Structure~",
                table: "StructureAssignments");

            migrationBuilder.DropIndex(
                name: "IX_StructureUsages_ProjectId_StructureId_TargetKind",
                table: "StructureUsages");
        }
    }
}
