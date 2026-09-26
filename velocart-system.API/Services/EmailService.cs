using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using System;
using System.Threading.Tasks;

namespace velocart_system.API.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string htmlBody);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            try
            {
                // Safely extract config values to prevent CS8604 null reference warnings
                string smtpUser = _config["EmailConfiguration:SmtpUsername"] ?? string.Empty;
                string smtpPass = _config["EmailConfiguration:SmtpPassword"] ?? string.Empty;
                string smtpHost = _config["EmailConfiguration:SmtpServer"] ?? string.Empty;
                int smtpPort = int.Parse(_config["EmailConfiguration:SmtpPort"] ?? "587");

                var email = new MimeMessage();
                email.From.Add(new MailboxAddress("Velocart Smart Supermarket", smtpUser));
                email.To.Add(MailboxAddress.Parse(toEmail));
                email.Subject = subject;

                var builder = new BodyBuilder { HtmlBody = htmlBody };
                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                await smtp.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(smtpUser, smtpPass);
                
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email sending failed: {ex.Message}");
            }
        }
    }
}