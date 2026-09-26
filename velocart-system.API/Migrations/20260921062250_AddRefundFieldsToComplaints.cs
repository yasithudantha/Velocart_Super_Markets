using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundFieldsToComplaints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RefundMethod",
                table: "DeliveryComplaints",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefundProcessedAt",
                table: "DeliveryComplaints",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundReceiptNumber",
                table: "DeliveryComplaints",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundStatus",
                table: "DeliveryComplaints",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RefundMethod",
                table: "DeliveryComplaints");

            migrationBuilder.DropColumn(
                name: "RefundProcessedAt",
                table: "DeliveryComplaints");

            migrationBuilder.DropColumn(
                name: "RefundReceiptNumber",
                table: "DeliveryComplaints");

            migrationBuilder.DropColumn(
                name: "RefundStatus",
                table: "DeliveryComplaints");
        }
    }
}
