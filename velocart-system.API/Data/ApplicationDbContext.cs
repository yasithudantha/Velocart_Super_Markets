using Microsoft.EntityFrameworkCore;
using velocart_system.API.Models;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using velocart_system.API.Features.Catalog.Models;
using velocart_system.API.Features.Cart.Models;
using velocart_system.API.Features.Orders.Models;
using velocart_system.API.Features.Reviews.Models;
using velocart_system.API.Features.Inventory.Models;
using velocart_system.API.Features.Loyalty.Models;
using velocart_system.API.Features.Promotions.Models; 
using velocart_system.API.Features.Taxes.Models;  
using velocart_system.API.Features.Identity.Models;
using velocart_system.API.Features.AgenticAI.Models;    

namespace velocart_system.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }
        public DbSet<PriceHistory> PriceHistories { get; set; }
        public DbSet<ShoppingCart> ShoppingCarts { get; set; }
        public DbSet<ShoppingCartItem> ShoppingCartItems { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<OrderPromotion> OrderPromotions { get; set; }
        public DbSet<DeliveryDetail> DeliveryDetails { get; set; }
        public DbSet<DeliveryComplaint> DeliveryComplaints { get; set; }
        public DbSet<OrderLocation> OrderLocations { get; set; }
        public DbSet<Review> Reviews { get; set; }

        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<SupplierProduct> SupplierProducts { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
        public DbSet<GoodsReceipt> GoodsReceipts { get; set; }
        public DbSet<GoodsReceiptItem> GoodsReceiptItems { get; set; }
        public DbSet<ProductBatch> ProductBatches { get; set; }
        public DbSet<InventoryTransaction> InventoryTransactions { get; set; }
        public DbSet<StockReservation> StockReservations { get; set; }

        public DbSet<LoyaltyRule> LoyaltyRules { get; set; }
        public DbSet<LoyaltyAccount> LoyaltyAccounts { get; set; }
        public DbSet<LoyaltyTierHistory> LoyaltyTierHistories { get; set; }
        public DbSet<LoyaltyPointLot> LoyaltyPointLots { get; set; }
        public DbSet<LoyaltyTransaction> LoyaltyTransactions { get; set; }

        public DbSet<Promotion> Promotions { get; set; }
        public DbSet<PromotionProduct> PromotionProducts { get; set; }
        public DbSet<PromotionCategory> PromotionCategories { get; set; }
        public DbSet<PromotionLoyaltyRule> PromotionLoyaltyRules { get; set; }
        public DbSet<PromotionCustomer> PromotionCustomers { get; set; }
        public DbSet<PromotionTier> PromotionTiers { get; set; }

        public DbSet<TaxRule> TaxRules { get; set; }
        public DbSet<TaxRuleProduct> TaxRuleProducts { get; set; }
        public DbSet<TaxRuleCategory> TaxRuleCategories { get; set; }

        public DbSet<ProductCharge> ProductCharges { get; set; }

        public DbSet<Notification> Notifications { get; set; }

        public DbSet<AgentWorkflow> AgentWorkflows { get; set; }

        public DbSet<SecurityEvent> SecurityEvents { get; set; }
        public DbSet<velocart_system.API.Features.Storefront.Models.StorefrontBanner> StorefrontBanners { get; set; }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            base.ConfigureConventions(configurationBuilder);

            // Enforce UTC kind for all DateTime properties saved to PostgreSQL
            configurationBuilder.Properties<DateTime>()
                .HaveConversion(typeof(UtcDateTimeConverter));
            configurationBuilder.Properties<DateTime?>()
                .HaveConversion(typeof(NullableUtcDateTimeConverter));
        }

        // Value Converters for Npgsql UTC handling
        public class UtcDateTimeConverter : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>
        {
            public UtcDateTimeConverter() : base(
                v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
            { }
        }

        public class NullableUtcDateTimeConverter : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>
        {
            public NullableUtcDateTimeConverter() : base(
                v => !v.HasValue ? v : (v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
                v => !v.HasValue ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc))
            { }
        }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
            modelBuilder.Entity<User>().HasIndex(u => u.PhoneNumber).IsUnique();
            modelBuilder.Entity<ProductVariant>().HasIndex(v => v.SKU).IsUnique();

            modelBuilder.Entity<User>()
                .HasOne(u => u.LoyaltyAccount)
                .WithOne(l => l.User)
                .HasForeignKey<LoyaltyAccount>(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PromotionProduct>().HasKey(x => new { x.PromotionId, x.ProductId });
            modelBuilder.Entity<PromotionCategory>().HasKey(x => new { x.PromotionId, x.CategoryId });
            modelBuilder.Entity<PromotionLoyaltyRule>().HasKey(x => new { x.PromotionId, x.LoyaltyRuleId });
            modelBuilder.Entity<PromotionCustomer>().HasKey(x => new { x.PromotionId, x.UserId });
            
            modelBuilder.Entity<TaxRuleProduct>().HasKey(x => new { x.TaxRuleId, x.ProductId });
            modelBuilder.Entity<TaxRuleCategory>().HasKey(x => new { x.TaxRuleId, x.CategoryId });

            modelBuilder.Entity<Address>()
                .HasOne(a => a.User).WithMany(u => u.Addresses)
                .HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderLocation>()
                .HasOne(ol => ol.Order)
                .WithMany(o => o.Locations)
                .HasForeignKey(ol => ol.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Category>()
                .HasOne(c => c.ParentCategory).WithMany(c => c.SubCategories)
                .HasForeignKey(c => c.ParentCategoryId).OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Product>()
                .HasMany(p => p.Variants).WithOne(v => v.Product)
                .HasForeignKey(v => v.ProductId).OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Product>()
                .HasMany(p => p.Images).WithOne(i => i.Product)
                .HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Cascade); 

            modelBuilder.Entity<SupplierProduct>().HasKey(sp => new { sp.SupplierId, sp.ProductVariantId });

            modelBuilder.Entity<SupplierProduct>()
                .HasOne(sp => sp.Supplier)
                .WithMany()
                .HasForeignKey(sp => sp.SupplierId);

            modelBuilder.Entity<SupplierProduct>()
                .HasOne(sp => sp.ProductVariant)
                .WithMany()
                .HasForeignKey(sp => sp.ProductVariantId);

            modelBuilder.Entity<PurchaseOrder>()
                .HasOne(po => po.Supplier)
                .WithMany(s => s.PurchaseOrders)
                .HasForeignKey(po => po.SupplierId)
                .OnDelete(DeleteBehavior.Restrict); 

            modelBuilder.Entity<PurchaseOrderItem>()
                .HasOne(poi => poi.PurchaseOrder)
                .WithMany(po => po.Items)
                .HasForeignKey(poi => poi.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<GoodsReceipt>()
                .HasOne(gr => gr.PurchaseOrder)
                .WithMany()
                .HasForeignKey(gr => gr.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GoodsReceiptItem>()
                .HasOne(gri => gri.GoodsReceipt)
                .WithMany(gr => gr.Items)
                .HasForeignKey(gri => gri.GoodsReceiptId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProductBatch>()
                .HasOne(pb => pb.ProductVariant)
                .WithMany(v => v.Batches)
                .HasForeignKey(pb => pb.ProductVariantId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<InventoryTransaction>()
                .HasOne(it => it.ProductVariant)
                .WithMany()
                .HasForeignKey(it => it.ProductVariantId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StockReservation>()
                .HasOne(sr => sr.ProductVariant)
                .WithMany()
                .HasForeignKey(sr => sr.ProductVariantId)
                .OnDelete(DeleteBehavior.Cascade);
        }
        
        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateTimestamps();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void UpdateTimestamps()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                var updatedAtProp = entry.Metadata.FindProperty("UpdatedAt");
                if (updatedAtProp != null)
                {
                    entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
                }

                if (entry.State == EntityState.Added)
                {
                    var createdAtProp = entry.Metadata.FindProperty("CreatedAt");
                    if (createdAtProp != null)
                    {
                        entry.Property("CreatedAt").CurrentValue = DateTime.UtcNow;
                    }
                }
            }
        }
    }
}