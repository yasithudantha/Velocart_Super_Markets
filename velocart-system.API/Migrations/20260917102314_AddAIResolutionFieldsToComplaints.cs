using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAIResolutionFieldsToComplaints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompensatoryPoints",
                table: "DeliveryComplaints",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "DeliveryComplaints",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ResolutionNotes",
                table: "DeliveryComplaints",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompensatoryPoints",
                table: "DeliveryComplaints");

            migrationBuilder.DropColumn(
                name: "RefundAmount",
                table: "DeliveryComplaints");

            migrationBuilder.DropColumn(
                name: "ResolutionNotes",
                table: "DeliveryComplaints");
        }
    }
}
