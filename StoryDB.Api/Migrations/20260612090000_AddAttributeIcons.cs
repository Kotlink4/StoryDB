using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using StoryDB.Api.Data;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(StoryDbContext))]
    [Migration("20260612090000_AddAttributeIcons")]
    public partial class AddAttributeIcons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IconKey",
                table: "AttributeGroups",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IconKey",
                table: "AttributeDefinitions",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IconKey",
                table: "AttributeGroups");

            migrationBuilder.DropColumn(
                name: "IconKey",
                table: "AttributeDefinitions");
        }
    }
}
