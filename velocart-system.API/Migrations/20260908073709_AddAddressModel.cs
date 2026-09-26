using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAddressModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Street",
                table: "Addresses");

            migrationBuilder.RenameColumn(
                name: "Type",
                table: "Addresses",
                newName: "AddressType");

            migrationBuilder.RenameColumn(
                name: "State",
                table: "Addresses",
                newName: "Country");

            migrationBuilder.AddColumn<string>(
                name: "StreetLine1",
                table: "Addresses",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StreetLine2",
                table: "Addresses",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StreetLine1",
                table: "Addresses");

            migrationBuilder.DropColumn(
                name: "StreetLine2",
                table: "Addresses");

            migrationBuilder.RenameColumn(
                name: "Country",
                table: "Addresses",
                newName: "State");

            migrationBuilder.RenameColumn(
                name: "AddressType",
                table: "Addresses",
                newName: "Type");

            migrationBuilder.AddColumn<string>(
                name: "Street",
                table: "Addresses",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }
    }
}
