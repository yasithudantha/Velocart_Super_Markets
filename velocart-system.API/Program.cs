using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using velocart_system.API.Data;
using velocart_system.API.Services;
using Stripe;
using velocart_system.API.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Controllers to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "velocart-system.API", Version = "v1" });

    // 1. Define the Security Scheme
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. \r\n\r\n Enter 'Bearer' [space] and then your token in the text input below.\r\n\r\nExample: \"Bearer eyJhbGci...\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    // 2. Apply it globally to all endpoints
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement()
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            },
            new System.Collections.Generic.List<string>()
        }
    });
});
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHostedService<velocart_system.API.Features.Loyalty.Services.LoyaltyExpirationService>();
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddHttpClient();

// 2. Configure Entity Framework Core with PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 3. Configure CORS to allow the React Frontend and Mobile App to communicate
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

// 4. Configure Strict JWT Authentication Security
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true, // Checks token expiration automatically
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!))
        };
    });

StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"];

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 5. Configure the HTTP request pipeline
app.UseCors("AllowAll");

// CRUCIAL SECURITY RULE: Authentication must always come BEFORE Authorization
app.UseAuthentication(); 
app.UseAuthorization();

// 6. Map the API Controllers
app.MapControllers();

// 7. Database Migration and Seeding
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    
    context.Database.Migrate();

    var mainAdminEmail = config["MainAdminSetup:Email"];
    var mainAdminPassword = config["MainAdminSetup:Password"];

    if (!string.IsNullOrEmpty(mainAdminEmail) && !string.IsNullOrEmpty(mainAdminPassword))
    {
        if (!context.Users.Any(u => u.Email == mainAdminEmail))
        {
            var mainAdmin = new User
            {
                FullName = config["MainAdminSetup:FullName"] ?? "System Chief Administrator",
                Email = mainAdminEmail,
                PhoneNumber = config["MainAdminSetup:PhoneNumber"] ?? "+94770000002",
                Role = "MAINADMIN", 
                AccountStatus = "ACTIVE",
                IsEmailVerified = true,
                AgreedToTerms = true,
                AgreedToPrivacyPolicy = true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(mainAdminPassword),
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(mainAdmin);
            context.SaveChanges();

            context.SecurityEvents.Add(new velocart_system.API.Features.Identity.Models.SecurityEvent 
            {
                UserId = mainAdmin.Id,
                EventType = "System Initialization",
                Description = "Auto-provisioned initial MAINADMIN account from appsettings.json."
            });
            
            context.SaveChanges();
            Console.WriteLine("SUCCESS: Default MAIN ADMIN account provisioned.");
        }
    }

    // --- SEED ADMIN ---
    if (!context.Users.Any(u => u.Role == "ADMIN"))
    {
        var adminEmail = config["AdminSetup:Email"];
        var adminPassword = config["AdminSetup:Password"];

        if (!string.IsNullOrEmpty(adminEmail) && !string.IsNullOrEmpty(adminPassword))
        {
            context.Users.Add(new User
            {
                FullName = "System Administrator",
                Email = adminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                PhoneNumber = "0000000000",
                Role = "ADMIN",
                AccountStatus = "Active",
                AgreedToTerms = true,
                AgreedToPrivacyPolicy = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            context.SaveChanges();
        }
    }

    // --- SEED DELIVERY MANAGER ---
    var dmEmail = config["DeliveryManagerSetup:Email"];
    var dmPassword = config["DeliveryManagerSetup:Password"];

    if (!string.IsNullOrEmpty(dmEmail) && !string.IsNullOrEmpty(dmPassword) && !context.Users.Any(u => u.Email == dmEmail))
    {
        context.Users.Add(new User
        {
            FullName = "Head of Delivery",
            Email = dmEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dmPassword),
            PhoneNumber = "+94770000000",
            Role = "DELIVERYMANAGER", 
            AccountStatus = "Active",
            AgreedToTerms = true,
            AgreedToPrivacyPolicy = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        context.SaveChanges();
    }

    // --- SEED PROMOTION MANAGER (NEW) ---
    var pmEmail = config["PromotionManagerSetup:Email"];
    var pmPassword = config["PromotionManagerSetup:Password"];

    if (!string.IsNullOrEmpty(pmEmail) && !string.IsNullOrEmpty(pmPassword) && !context.Users.Any(u => u.Email == pmEmail))
    {
        context.Users.Add(new User
        {
            FullName = "Head of Promotions",
            Email = pmEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(pmPassword),
            PhoneNumber = "+94770000001",
            Role = "PROMOTIONMANAGER", 
            AccountStatus = "Active",
            AgreedToTerms = true,
            AgreedToPrivacyPolicy = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        context.SaveChanges();
    }
}

app.Run();