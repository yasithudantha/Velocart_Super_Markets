using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "DeliveryComplaints",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "DeliveryComplaints");
        }
    }
}
