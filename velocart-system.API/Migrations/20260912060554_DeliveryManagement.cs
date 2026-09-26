using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class DeliveryManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCustomerConfirmed",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "DeliveryComplaints",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    Subject = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryComplaints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryComplaints_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeliveryComplaints_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    DeliveryNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EstimatedDeliveryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EstimatedDeliveryTime = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AssignedDriverName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AssignedDriverContact = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DeliveryNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryDetails_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryComplaints_CustomerId",
                table: "DeliveryComplaints",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryComplaints_OrderId",
                table: "DeliveryComplaints",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryDetails_OrderId",
                table: "DeliveryDetails",
                column: "OrderId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeliveryComplaints");

            migrationBuilder.DropTable(
                name: "DeliveryDetails");

            migrationBuilder.DropColumn(
                name: "IsCustomerConfirmed",
                table: "Orders");
        }
    }
}
