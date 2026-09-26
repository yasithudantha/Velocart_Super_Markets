using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.AgenticAI.Models;

namespace velocart_system.API.Features.AgenticAI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AgentWorkflowController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AgentWorkflowController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. Used by Python AI to save a drafted workflow requiring Human Approval
        [HttpPost]
        [AllowAnonymous] // Internal service call (Secure via IP or internal network in production)
        public async Task<ActionResult> CreateWorkflowState([FromBody] AgentWorkflow request)
        {
            _context.AgentWorkflows.Add(request);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Workflow state saved. Awaiting human approval.", id = request.Id });
        }

        // 2. Used by the React Admin Dashboard to view pending AI workflows
        [HttpGet("pending")]
        [Authorize(Roles = "PROMOTIONMANAGER,DELIVERYMANAGER,ADMIN")]
        public async Task<ActionResult> GetPendingWorkflows()
        {
            var workflows = await _context.AgentWorkflows
                .Where(w => w.Status == "PENDING_APPROVAL")
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();
            return Ok(workflows);
        }

        // 3. Used by the Human to Approve/Reject the AI's proposed payload
        [HttpPut("{id}/status")]
        [Authorize(Roles = "PROMOTIONMANAGER,DELIVERYMANAGER,ADMIN")]
        public async Task<ActionResult> UpdateWorkflowStatus(int id, [FromBody] string status)
        {
            var workflow = await _context.AgentWorkflows.FindAsync(id);
            if (workflow == null) return NotFound();

            workflow.Status = status; // e.g., APPROVED or REJECTED
            workflow.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            return Ok(new { message = $"Workflow {id} marked as {status}." });
        }

        // 4. Trigger the Python LangGraph AI (Agent Integration Requirement)
        [HttpPost("trigger")]
        [Authorize(Roles = "PROMOTIONMANAGER,ADMIN")]
        public async Task<ActionResult> TriggerPythonAgent()
        {
            using var client = new System.Net.Http.HttpClient();
            try
            {
                // Call the Python FastAPI Server
                var payload = new { objective = "Run autonomous FEFO markdown protocol." };
                var content = new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                
                var response = await client.PostAsync("http://127.0.0.1:8000/start-optimizer", content);
                
                if (response.IsSuccessStatusCode)
                {
                    return Ok(new { message = "AI Workflow successfully triggered. It is now analyzing inventory." });
                }
                return BadRequest("The AI Service encountered an error.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to connect to Python AI Service. Is it running on port 8000? Error: {ex.Message}");
            }
        }
        
        // 5. Trigger Workflow 2: Dispute Adjudicator
        [HttpPost("trigger-adjudicator")]
        [Authorize(Roles = "DELIVERYMANAGER,ADMIN")]
        public async Task<ActionResult> TriggerDisputeAgent()
        {
            using var client = new System.Net.Http.HttpClient();
            try
            {
                var payload = new { objective = "Adjudicate pending customer delivery complaints." };
                var content = new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                
                // MAKE SURE IT HAS http:// EXACTLY LIKE THIS:
                var response = await client.PostAsync("http://127.0.0.1:8000/start-adjudicator", content);
                
                if (response.IsSuccessStatusCode)
                    return Ok(new { message = "Dispute Adjudicator AI triggered successfully." });
                
                return BadRequest("The AI Service encountered an error.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to connect to Python AI Service. Error: {ex.Message}");
            }
        }
        
        // 6. Trigger Workflow 3: Predictive PO Generator
        [HttpPost("trigger-erp")]
        [Authorize(Roles = "PRODUCTMANAGER,ADMIN")] 
        public async Task<ActionResult> TriggerErpAgent()
        {
            using var client = new System.Net.Http.HttpClient();
            try
            {
                var payload = new { objective = "Forecast inventory demand and draft Supplier Purchase Orders." };
                var content = new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                
                var response = await client.PostAsync("http://127.0.0.1:8000/start-po-generator", content);
                
                if (response.IsSuccessStatusCode)
                    return Ok(new { message = "ERP Supply Chain AI triggered successfully." });
                
                return BadRequest("The AI Service encountered an error.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to connect to Python AI Service. Error: {ex.Message}");
            }
        }

        // 7. Trigger Workflow 4: Catalog Compliance Auditor
        [HttpPost("trigger-compliance")]
        [Authorize(Roles = "PROMOTIONMANAGER,ADMIN")] 
        public async Task<ActionResult> TriggerComplianceAgent()
        {
            using var client = new System.Net.Http.HttpClient();

            client.Timeout = TimeSpan.FromMinutes(5);
            
            try
            {
                var payload = new { objective = "Audit the catalog for missing tax compliances and simulate impacts." };
                var content = new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                
                var response = await client.PostAsync("http://127.0.0.1:8000/start-compliance", content);
                
                if (response.IsSuccessStatusCode)
                    return Ok(new { message = "Finance Compliance AI triggered successfully." });
                
                return BadRequest("The AI Service encountered an error.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to connect to Python AI Service. Error: {ex.Message}");
            }
        }
    }
}