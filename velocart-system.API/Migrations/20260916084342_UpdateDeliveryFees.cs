using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDeliveryFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductChargeCategories");

            migrationBuilder.DropTable(
                name: "ProductChargeProducts");

            migrationBuilder.AddColumn<decimal>(
                name: "MaxOrderAmount",
                table: "ProductCharges",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MinOrderAmount",
                table: "ProductCharges",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxOrderAmount",
                table: "ProductCharges");

            migrationBuilder.DropColumn(
                name: "MinOrderAmount",
                table: "ProductCharges");

            migrationBuilder.CreateTable(
                name: "ProductChargeCategories",
                columns: table => new
                {
                    ProductChargeId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductChargeCategories", x => new { x.ProductChargeId, x.CategoryId });
                    table.ForeignKey(
                        name: "FK_ProductChargeCategories_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductChargeCategories_ProductCharges_ProductChargeId",
                        column: x => x.ProductChargeId,
                        principalTable: "ProductCharges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductChargeProducts",
                columns: table => new
                {
                    ProductChargeId = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductChargeProducts", x => new { x.ProductChargeId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_ProductChargeProducts_ProductCharges_ProductChargeId",
                        column: x => x.ProductChargeId,
                        principalTable: "ProductCharges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductChargeProducts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductChargeCategories_CategoryId",
                table: "ProductChargeCategories",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductChargeProducts_ProductId",
                table: "ProductChargeProducts",
                column: "ProductId");
        }
    }
}
