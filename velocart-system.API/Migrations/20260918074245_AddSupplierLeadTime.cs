using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierLeadTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LeadTimeDays",
                table: "SupplierProducts",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LeadTimeDays",
                table: "SupplierProducts");
        }
    }
}
