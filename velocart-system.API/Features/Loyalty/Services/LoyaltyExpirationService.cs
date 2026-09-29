using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Loyalty.Models;
using velocart_system.API.Features.Identity.Models;

namespace velocart_system.API.Features.Loyalty.Services
{
    public class LoyaltyExpirationService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<LoyaltyExpirationService> _logger;

        public LoyaltyExpirationService(IServiceProvider serviceProvider, ILogger<LoyaltyExpirationService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Loyalty Expiration & Tier Evaluation Service is starting.");

            // Run this loop continuously as long as the API is running
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpirationsAndDowngradesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while processing loyalty expirations.");
                }

                // Wait 24 hours before checking again. 
                // (You can change this to TimeSpan.FromMinutes(1) during testing!)
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }

        private async Task ProcessExpirationsAndDowngradesAsync()
        {
            // Background services require a scope to access scoped DbContexts
            using var scope = _serviceProvider.CreateScope();
            var _context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now = DateTime.UtcNow;

            // =========================================================
            // 1. PROCESS POINT EXPIRATIONS (SRS 6.16)
            // =========================================================
            var expiredLots = await _context.LoyaltyPointLots
                .Include(l => l.LoyaltyAccount)
                .Where(l => !l.IsExpired && l.RemainingPoints > 0 && l.ExpiresAt <= now)
                .ToListAsync();

            int totalLotsExpired = 0;

            foreach (var lot in expiredLots)
            {
                if (lot.LoyaltyAccount == null) continue;

                int pointsToExpire = lot.RemainingPoints;
                int balanceBefore = lot.LoyaltyAccount.CurrentPointsBalance;
                
                // Deduct expired points
                lot.LoyaltyAccount.CurrentPointsBalance -= pointsToExpire;
                if (lot.LoyaltyAccount.CurrentPointsBalance < 0) lot.LoyaltyAccount.CurrentPointsBalance = 0; // Safeguard

                // Void the lot
                lot.RemainingPoints = 0;
                lot.IsExpired = true;

                // Create Immutable Ledger Entry
                _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                {
                    LoyaltyAccountId = lot.LoyaltyAccount.Id,
                    TransactionReference = $"LOY-EXP-{now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 6)}",
                    TransactionType = "EXPIRED",
                    SourceType = "SYSTEM",
                    Points = -pointsToExpire, // Negative to represent deduction
                    BalanceBefore = balanceBefore,
                    BalanceAfter = lot.LoyaltyAccount.CurrentPointsBalance,
                    Reason = "Points expired according to tier expiry rules."
                });

                _context.Notifications.Add(new Notification
                {
                    UserId = lot.LoyaltyAccount.UserId,
                    Title = "Loyalty Points Expired",
                    Message = $"We're sorry, {pointsToExpire} of your VelocityFamily points have expired according to the 1-year policy.",
                    Type = "LOYALTY"
                });

                totalLotsExpired++;
            }

            // =========================================================
            // 2. PROCESS TIER DOWNGRADES / ANNUAL REVIEW (SRS 6.14)
            // =========================================================
            var allRules = await _context.LoyaltyRules.OrderByDescending(r => r.MinimumPoints).ToListAsync();
            
            // Find accounts whose 1-year evaluation period is up today
            var accountsToEvaluate = await _context.LoyaltyAccounts
                .Include(a => a.CurrentTier)
                .Where(a => a.LastRenewedAt.HasValue && a.Status == "ACTIVE")
                .ToListAsync();

            int totalAccountsReviewed = 0;

            foreach (var account in accountsToEvaluate)
            {
                if (account.CurrentTier == null || !account.LastRenewedAt.HasValue) continue;

                var evaluationEndDate = account.LastRenewedAt.Value.AddDays(account.CurrentTier.TierEvaluationPeriodDays);
                
                // If it's time for their annual review...
                if (evaluationEndDate <= now)
                {
                    // Calculate how many points they actually earned DURING this 1-year period
                    var earnedInPeriod = await _context.LoyaltyTransactions
                        .Where(t => t.LoyaltyAccountId == account.Id && t.TransactionType == "EARNED" && t.CreatedAt >= account.LastRenewedAt.Value)
                        .SumAsync(t => t.Points);

                    // Determine what tier they actually qualify for now based on this year's activity
                    var applicableTier = allRules.FirstOrDefault(r => earnedInPeriod >= r.MinimumPoints) ?? allRules.Last();

                    // If they dropped a tier, trigger a downgrade
                    if (applicableTier.Id != account.CurrentTierRuleId)
                    {
                        _context.LoyaltyTierHistories.Add(new LoyaltyTierHistory
                        {
                            LoyaltyAccountId = account.Id,
                            PreviousTierName = account.CurrentTier.TierName,
                            NewTierName = applicableTier.TierName,
                            Reason = $"Annual Review: Earned {earnedInPeriod} points this period. Criteria for {account.CurrentTier.TierName} not met."
                        });

                        account.CurrentTierRuleId = applicableTier.Id;

                        _context.Notifications.Add(new Notification
                        {
                            UserId = account.UserId,
                            Title = "VelocityFamily Tier Update",
                            Message = $"Following your annual review, your tier has been updated to {applicableTier.TierName}.",
                            Type = "LOYALTY"
                        });
                    }

                    // Reset the clock for the next year
                    account.LastRenewedAt = now;
                    account.ExpiryDate = now.AddDays(applicableTier.TierEvaluationPeriodDays);
                    totalAccountsReviewed++;
                }
            }

            if (totalLotsExpired > 0 || totalAccountsReviewed > 0)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Loyalty Service Complete: Expired {Lots} point lots. Processed {Reviews} annual tier reviews.", totalLotsExpired, totalAccountsReviewed);
            }
        }
    }
}