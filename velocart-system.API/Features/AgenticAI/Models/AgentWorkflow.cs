using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace velocart_system.API.Features.AgenticAI.Models
{
    public class AgentWorkflow
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string WorkflowName { get; set; } = string.Empty;

        // E.g., RUNNING, AWAITING_APPROVAL, APPROVED, REJECTED, COMPLETED, FAILED
        [Required, MaxLength(50)]
        public string Status { get; set; } = "RUNNING"; 

        // This will store the Agent's execution trace and justification
        [Column(TypeName = "text")]
        public string ExecutionSummary { get; set; } = string.Empty;

        // This will temporarily hold the generated CreatePromotionDto JSON until the human approves it
        [Column(TypeName = "text")]
        public string? ProposedPayload { get; set; } 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}