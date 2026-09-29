using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace velocart_system.API.Migrations
{
    /// <inheritdoc />
    public partial class AdvancedPromotionsAndLoyalty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoyaltyTransactions_Orders_OrderId",
                table: "LoyaltyTransactions");

            migrationBuilder.DropIndex(
                name: "IX_LoyaltyTransactions_OrderId",
                table: "LoyaltyTransactions");

            migrationBuilder.DropColumn(
                name: "ApplicableLoyaltyTiers",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "DiscountType",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "TargetCategoryId",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "TieredDiscountRules",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "AppliedPromotionId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "AppliedPromotionName",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Tier",
                table: "LoyaltyAccounts");

            migrationBuilder.RenameColumn(
                name: "TargetProductId",
                table: "Promotions",
                newName: "RewardProductId");

            migrationBuilder.RenameColumn(
                name: "IsMemberOnly",
                table: "Promotions",
                newName: "IsLoyaltyPromotion");

            migrationBuilder.RenameColumn(
                name: "OrderId",
                table: "LoyaltyTransactions",
                newName: "SourceId");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Promotions",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Promotions",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Promotions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Promotions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Promotions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Promotions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "OriginalUnitPrice",
                table: "OrderItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PromotionDiscountAmount",
                table: "OrderItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmount",
                table: "OrderItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "LoyaltyTransactions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReversesTransactionId",
                table: "LoyaltyTransactions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceType",
                table: "LoyaltyTransactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TransactionReference",
                table: "LoyaltyTransactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalEligibleSpend",
                table: "LoyaltyAccounts",
                type: "numeric(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AddColumn<int>(
                name: "CurrentTierRuleId",
                table: "LoyaltyAccounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastRenewedAt",
                table: "LoyaltyAccounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LoyaltyPointLots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LoyaltyAccountId = table.Column<int>(type: "integer", nullable: false),
                    SourceTransactionId = table.Column<int>(type: "integer", nullable: false),
                    OriginalPoints = table.Column<int>(type: "integer", nullable: false),
                    RemainingPoints = table.Column<int>(type: "integer", nullable: false),
                    IsExpired = table.Column<bool>(type: "boolean", nullable: false),
                    EarnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoyaltyPointLots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoyaltyPointLots_LoyaltyAccounts_LoyaltyAccountId",
                        column: x => x.LoyaltyAccountId,
                        principalTable: "LoyaltyAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LoyaltyPointLots_LoyaltyTransactions_SourceTransactionId",
                        column: x => x.SourceTransactionId,
                        principalTable: "LoyaltyTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LoyaltyRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TierName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MinimumPoints = table.Column<int>(type: "integer", nullable: false),
                    MaximumPoints = table.Column<int>(type: "integer", nullable: true),
                    CurrencyAmountPerPoint = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MaxRedeemablePointsPerOrder = table.Column<int>(type: "integer", nullable: false),
                    MaxDiscountPercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    EligibleCategoryIds = table.Column<string>(type: "text", nullable: false),
                    PointExpiryDays = table.Column<int>(type: "integer", nullable: false),
                    TierEvaluationPeriodDays = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoyaltyRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LoyaltyTierHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LoyaltyAccountId = table.Column<int>(type: "integer", nullable: false),
                    PreviousTierName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NewTierName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Reason = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoyaltyTierHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoyaltyTierHistories_LoyaltyAccounts_LoyaltyAccountId",
                        column: x => x.LoyaltyAccountId,
                        principalTable: "LoyaltyAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderPromotions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    OriginalPromotionId = table.Column<int>(type: "integer", nullable: true),
                    PromotionNameSnapshot = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PromotionTypeSnapshot = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DiscountApplied = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderPromotions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderPromotions_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductCharges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ChargeType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AmountOrPercentage = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCharges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PromotionCategories",
                columns: table => new
                {
                    PromotionId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionCategories", x => new { x.PromotionId, x.CategoryId });
                    table.ForeignKey(
                        name: "FK_PromotionCategories_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PromotionCategories_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalTable: "Promotions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PromotionCustomers",
                columns: table => new
                {
                    PromotionId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionCustomers", x => new { x.PromotionId, x.UserId });
                    table.ForeignKey(
                        name: "FK_PromotionCustomers_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalTable: "Promotions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PromotionCustomers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PromotionProducts",
                columns: table => new
                {
                    PromotionId = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionProducts", x => new { x.PromotionId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_PromotionProducts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PromotionProducts_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalTable: "Promotions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PromotionTiers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PromotionId = table.Column<int>(type: "integer", nullable: false),
                    MinimumSpendAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DiscountValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionTiers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PromotionTiers_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalTable: "Promotions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaxRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RatePercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PromotionLoyaltyRules",
                columns: table => new
                {
                    PromotionId = table.Column<int>(type: "integer", nullable: false),
                    LoyaltyRuleId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionLoyaltyRules", x => new { x.PromotionId, x.LoyaltyRuleId });
                    table.ForeignKey(
                        name: "FK_PromotionLoyaltyRules_LoyaltyRules_LoyaltyRuleId",
                        column: x => x.LoyaltyRuleId,
                        principalTable: "LoyaltyRules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PromotionLoyaltyRules_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalTable: "Promotions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.CreateTable(
                name: "TaxRuleCategories",
                columns: table => new
                {
                    TaxRuleId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxRuleCategories", x => new { x.TaxRuleId, x.CategoryId });
                    table.ForeignKey(
                        name: "FK_TaxRuleCategories_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaxRuleCategories_TaxRules_TaxRuleId",
                        column: x => x.TaxRuleId,
                        principalTable: "TaxRules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaxRuleProducts",
                columns: table => new
                {
                    TaxRuleId = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxRuleProducts", x => new { x.TaxRuleId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_TaxRuleProducts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaxRuleProducts_TaxRules_TaxRuleId",
                        column: x => x.TaxRuleId,
                        principalTable: "TaxRules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyTransactions_ReversesTransactionId",
                table: "LoyaltyTransactions",
                column: "ReversesTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyAccounts_CurrentTierRuleId",
                table: "LoyaltyAccounts",
                column: "CurrentTierRuleId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyPointLots_LoyaltyAccountId",
                table: "LoyaltyPointLots",
                column: "LoyaltyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyPointLots_SourceTransactionId",
                table: "LoyaltyPointLots",
                column: "SourceTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyTierHistories_LoyaltyAccountId",
                table: "LoyaltyTierHistories",
                column: "LoyaltyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPromotions_OrderId",
                table: "OrderPromotions",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductChargeCategories_CategoryId",
                table: "ProductChargeCategories",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductChargeProducts_ProductId",
                table: "ProductChargeProducts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCategories_CategoryId",
                table: "PromotionCategories",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCustomers_UserId",
                table: "PromotionCustomers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionLoyaltyRules_LoyaltyRuleId",
                table: "PromotionLoyaltyRules",
                column: "LoyaltyRuleId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionProducts_ProductId",
                table: "PromotionProducts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionTiers_PromotionId",
                table: "PromotionTiers",
                column: "PromotionId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxRuleCategories_CategoryId",
                table: "TaxRuleCategories",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxRuleProducts_ProductId",
                table: "TaxRuleProducts",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_LoyaltyAccounts_LoyaltyRules_CurrentTierRuleId",
                table: "LoyaltyAccounts",
                column: "CurrentTierRuleId",
                principalTable: "LoyaltyRules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LoyaltyTransactions_LoyaltyTransactions_ReversesTransaction~",
                table: "LoyaltyTransactions",
                column: "ReversesTransactionId",
                principalTable: "LoyaltyTransactions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoyaltyAccounts_LoyaltyRules_CurrentTierRuleId",
                table: "LoyaltyAccounts");

            migrationBuilder.DropForeignKey(
                name: "FK_LoyaltyTransactions_LoyaltyTransactions_ReversesTransaction~",
                table: "LoyaltyTransactions");

            migrationBuilder.DropTable(
                name: "LoyaltyPointLots");

            migrationBuilder.DropTable(
                name: "LoyaltyTierHistories");

            migrationBuilder.DropTable(
                name: "OrderPromotions");

            migrationBuilder.DropTable(
                name: "ProductChargeCategories");

            migrationBuilder.DropTable(
                name: "ProductChargeProducts");

            migrationBuilder.DropTable(
                name: "PromotionCategories");

            migrationBuilder.DropTable(
                name: "PromotionCustomers");

            migrationBuilder.DropTable(
                name: "PromotionLoyaltyRules");

            migrationBuilder.DropTable(
                name: "PromotionProducts");

            migrationBuilder.DropTable(
                name: "PromotionTiers");

            migrationBuilder.DropTable(
                name: "TaxRuleCategories");

            migrationBuilder.DropTable(
                name: "TaxRuleProducts");

            migrationBuilder.DropTable(
                name: "ProductCharges");

            migrationBuilder.DropTable(
                name: "LoyaltyRules");

            migrationBuilder.DropTable(
                name: "TaxRules");

            migrationBuilder.DropIndex(
                name: "IX_LoyaltyTransactions_ReversesTransactionId",
                table: "LoyaltyTransactions");

            migrationBuilder.DropIndex(
                name: "IX_LoyaltyAccounts_CurrentTierRuleId",
                table: "LoyaltyAccounts");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "OriginalUnitPrice",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "PromotionDiscountAmount",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "TaxAmount",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "LoyaltyTransactions");

            migrationBuilder.DropColumn(
                name: "ReversesTransactionId",
                table: "LoyaltyTransactions");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "LoyaltyTransactions");

            migrationBuilder.DropColumn(
                name: "TransactionReference",
                table: "LoyaltyTransactions");

            migrationBuilder.DropColumn(
                name: "CurrentTierRuleId",
                table: "LoyaltyAccounts");

            migrationBuilder.DropColumn(
                name: "LastRenewedAt",
                table: "LoyaltyAccounts");

            migrationBuilder.RenameColumn(
                name: "RewardProductId",
                table: "Promotions",
                newName: "TargetProductId");

            migrationBuilder.RenameColumn(
                name: "IsLoyaltyPromotion",
                table: "Promotions",
                newName: "IsMemberOnly");

            migrationBuilder.RenameColumn(
                name: "SourceId",
                table: "LoyaltyTransactions",
                newName: "OrderId");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Promotions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Promotions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AddColumn<string>(
                name: "ApplicableLoyaltyTiers",
                table: "Promotions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscountType",
                table: "Promotions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Promotions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TargetCategoryId",
                table: "Promotions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TieredDiscountRules",
                table: "Promotions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AppliedPromotionId",
                table: "Orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AppliedPromotionName",
                table: "Orders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalEligibleSpend",
                table: "LoyaltyAccounts",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)");

            migrationBuilder.AddColumn<string>(
                name: "Tier",
                table: "LoyaltyAccounts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyTransactions_OrderId",
                table: "LoyaltyTransactions",
                column: "OrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_LoyaltyTransactions_Orders_OrderId",
                table: "LoyaltyTransactions",
                column: "OrderId",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
