using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplatePackFavoriteLookupIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectTemplatePackFavorites_TemplatePackId",
                table: "ProjectTemplatePackFavorites");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTemplatePackFavorites_TemplatePackId_UserId",
                table: "ProjectTemplatePackFavorites",
                columns: new[] { "TemplatePackId", "UserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectTemplatePackFavorites_TemplatePackId_UserId",
                table: "ProjectTemplatePackFavorites");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTemplatePackFavorites_TemplatePackId",
                table: "ProjectTemplatePackFavorites",
                column: "TemplatePackId");
        }
    }
}
