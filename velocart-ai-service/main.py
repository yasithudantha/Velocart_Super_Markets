from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import TypedDict, List, Optional, Dict
import requests
import json
import uvicorn
from datetime import datetime
from langgraph.graph import StateGraph, START, END
from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate


# ==========================================
# 1. SETUP & CONFIGURATION
# ==========================================
app = FastAPI(title="Velocart Agentic AI Subsystem")

import os

class LLMWrapper:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "gemini").lower()
        if self.provider == "local":
            self.llm = OllamaLLM(model="llama3.1", temperature=0, base_url="http://ollama-service:11434")
            print("🤖 LLM Initialized: Using LOCAL OLLAMA (llama3.1)")
        else:
            from langchain_google_genai import ChatGoogleGenerativeAI
            
            api_keys_str = os.getenv("GEMINI_API_KEY", "")
            if not api_keys_str or api_keys_str == "your_gemini_api_key_here":
                print("❌ ERROR: GEMINI_API_KEY is missing or invalid in .env!")
                self.gemini_pool = []
            else:
                # Support comma-separated keys for API Pooling to bypass rate limits
                keys = [k.strip() for k in api_keys_str.split(",") if k.strip()]
                self.gemini_pool = []
                for k in keys:
                    self.gemini_pool.append(ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", temperature=0, google_api_key=k))
                print(f"🤖 LLM Initialized: Using GEMINI API (gemini-3.5-flash-lite) with a pool of {len(self.gemini_pool)} keys.")
            self._pool_index = 0

    def invoke(self, prompt):
        if self.provider == "local":
            res = self.llm.invoke(prompt)
        else:
            if not self.gemini_pool:
                raise ValueError("No valid Gemini API keys found in the pool!")
            
            # Round-Robin API Key pooling rotation
            llm_instance = self.gemini_pool[self._pool_index]
            self._pool_index = (self._pool_index + 1) % len(self.gemini_pool)
            
            res = llm_instance.invoke(prompt)
            
        if hasattr(res, 'content'):
            content = res.content
            if isinstance(content, list):
                # Handle list of blocks (e.g., from multimodal models or new LangChain versions)
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                return "".join(text_parts)
            return content
        return str(res)

llm = LLMWrapper()

# C# Backend API URLs
# Using internal Docker network hostname instead of localhost!
CSHARP_BASE_URL = os.getenv("CSHARP_BASE_URL", "http://api:8080/api")
TOOL_INVENTORY_URL = f"{CSHARP_BASE_URL}/InventoryAnalytics/expiring"
TOOL_DISPUTES_URL = f"{CSHARP_BASE_URL}/DisputeAnalytics/pending"
TOOL_DEMAND_URL = f"{CSHARP_BASE_URL}/SupplyChainAnalytics/demand-forecast"
TOOL_SUPPLIER_URL = f"{CSHARP_BASE_URL}/SupplyChainAnalytics/supplier-catalog"
TOOL_UNMAPPED_URL = f"{CSHARP_BASE_URL}/CatalogCompliance/unmapped-products"
TOOL_TAXES_URL = f"{CSHARP_BASE_URL}/CatalogCompliance/active-taxes"
TOOL_SAVE_STATE_URL = f"{CSHARP_BASE_URL}/AgentWorkflow"

# ==========================================
# 2. SHARED STATE (Rubric: Persist workflow state)
# ==========================================
class AgentState(TypedDict):
    objective: str
    expiring_batches: List[Dict]
    analysis_report: str
    proposed_promotion: Optional[Dict]
    validation_passed: bool
    validation_errors: str
    workflow_status: str

# ==========================================
# 3. DISTINCT AGENTS (Rubric: 4 distinct roles)
# ==========================================

# --- AGENT 1: Domain Analysis Agent (Inventory Analyst) ---
def inventory_analyst_agent(state: AgentState):
    print("🤖 W1-Agent 1 (Inventory Analyst): Accessing Tools to fetch FEFO data...")
    try:
        # Tool Call: Fetch expiring inventory from C# backend
        response = requests.get(TOOL_INVENTORY_URL, params={"daysThreshold": 30})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and "message" in data:
                # No expiring batches found. Safe failure.
                state["workflow_status"] = "COMPLETED_NO_ACTION"
                state["analysis_report"] = "No batches are expiring within 30 days. No promotion needed."
                state["expiring_batches"] = []
                return state

            state["expiring_batches"] = data
            
            # Formulate the analysis report
            report = "Expiring Batches Analysis:\n"
            for batch in data:
                report += f"- Product: {batch['productName']} (ID: {batch['productId']}). Expires in {batch['daysUntilExpiry']} days. Qty to clear: {batch['expiringQuantity']}. 30-Day Sales Velocity: {batch['unitsSoldLast30Days']}\n"
            state["analysis_report"] = report
            print("✅ Agent 1 complete.")
        else:
            state["workflow_status"] = "FAILED"
            state["validation_errors"] = "Failed to communicate with Inventory API."
    except Exception as e:
        state["workflow_status"] = "FAILED"
        state["validation_errors"] = str(e)
        
    return state


# --- AGENT 2: Action / Tool Agent (Campaign Strategist) ---
def campaign_strategist_agent(state: AgentState):
    if state.get("workflow_status") == "COMPLETED_NO_ACTION" or state.get("workflow_status") == "FAILED":
        return state

    print("🤖 W1-Agent 2 (Campaign Strategist): Designing promotion strategy...")
    
    # Prompt the LLM to act as the strategist and output JSON
    prompt = PromptTemplate.from_template("""
    You are the VeloCart Campaign Strategist. Your objective is to design a promotion to clear expiring grocery stock.
    Analyze this inventory report: {report}
    
    Rules for your JSON output:
    1. 'Name': A catchy name for the sale.
    2. 'Description': A short description.
    3. 'Type': Choose exactly one: "PERCENTAGE_DISCOUNT", "FIXED_AMOUNT_DISCOUNT", "BUY_ONE_GET_ONE", "BUY_X_GET_Y". Use BUY_X_GET_Y if quantity is high and velocity is low.
    4. 'DiscountValue': Number between 5 and 50.
    5. 'ProductIds': Array of integers matching the Product IDs in the report.
    6. 'IsLoyaltyPromotion': true or false.
    7. 'BuyQuantityX' and 'GetQuantityY': Integers (or null if not BUY_X_GET_Y).
    
    Respond ONLY with valid JSON matching the exact keys above. Do not include markdown formatting or explanations.
    """)
    
    formatted_prompt = prompt.format(report=state["analysis_report"])
    result = llm.invoke(formatted_prompt)
    
    try:
        cleaned_result = result.strip().replace("```json", "").replace("```", "")
        
        # NOTE: Using { } because this agent returns a JSON Object, not an array
        start_idx = cleaned_result.find("{")
        end_idx = cleaned_result.rfind("}") + 1
        if start_idx != -1 and end_idx != 0:
            cleaned_result = cleaned_result[start_idx:end_idx]
            
        proposed_promo = json.loads(cleaned_result)
        state["proposed_promotion"] = proposed_promo
        print("✅ Agent 2 complete.")
    except Exception as e:
        state["workflow_status"] = "FAILED"
        state["validation_errors"] = f"Agent 2 produced invalid JSON: {result}"
        print("❌ Agent 2 Failed:", str(e))
        
    return state


# --- AGENT 3: Validation / Safety Agent (Deterministic Checker) ---
def safety_validator_agent(state: AgentState):
    if state.get("workflow_status") == "COMPLETED_NO_ACTION" or state.get("workflow_status") == "FAILED":
        return state

    print("🤖 Agent 3 (Safety Validator): Deterministically checking business rules...")
    promo = state["proposed_promotion"]
    errors = []
    
    # Deterministic Business Rule Validations (Rubric: deterministic validation)
    if not isinstance(promo, dict):
        errors.append("Payload is not a valid dictionary.")
    else:
        if promo.get("Type") == "PERCENTAGE_DISCOUNT" and (promo.get("DiscountValue", 0) > 50 or promo.get("DiscountValue", 0) < 0):
            errors.append("Safety Rule Violation: Percentage discount exceeds absolute ceiling of 50%.")
            
        if promo.get("Type") == "BUY_X_GET_Y":
            if not promo.get("BuyQuantityX") or not promo.get("GetQuantityY"):
                errors.append("Schema Violation: BUY_X_GET_Y must include BuyQuantityX and GetQuantityY.")
            
        if not promo.get("ProductIds") or len(promo.get("ProductIds")) == 0:
            errors.append("Safety Rule Violation: Promotion must target specific expiring products, not global.")

    if len(errors) > 0:
        state["validation_passed"] = False
        state["validation_errors"] = " | ".join(errors)
        print("❌ Agent 3 failed validation.")
    else:
        state["validation_passed"] = True
        state["validation_errors"] = ""
        print("✅ Agent 3 complete. Safe for Human Review.")
        
    return state


# --- AGENT 4: Coordinator / Planner (Orchestrator) ---
def coordinator_agent(state: AgentState):
    print("🤖 Agent 4 (Coordinator): Finalizing state and dispatching for Human Approval...")
    
    # If the workflow failed naturally or validation failed, log a safe failure (Rubric: safe failure)
    if state.get("workflow_status") == "FAILED" or not state.get("validation_passed", True):
        payload = {
            "WorkflowName": state["objective"],
            "Status": "FAILED",
            "ExecutionSummary": f"Workflow failed safely. Analysis: {state.get('analysis_report', 'N/A')} | Errors: {state.get('validation_errors')}",
            "ProposedPayload": None
        }
    elif state.get("workflow_status") == "COMPLETED_NO_ACTION":
        payload = {
            "WorkflowName": state["objective"],
            "Status": "COMPLETED",
            "ExecutionSummary": "Inventory scan complete. No batches are at risk of expiring.",
            "ProposedPayload": None
        }
    else:
        # HITL Pause: Save to DB as PENDING_APPROVAL
        payload = {
            "WorkflowName": state["objective"],
            "Status": "PENDING_APPROVAL",
            "ExecutionSummary": state["analysis_report"],
            "ProposedPayload": json.dumps(state["proposed_promotion"])
        }
        
    try:
        # Tool Call: Save state durably in C# backend (Rubric: Shared State / Observability)
        response = requests.post(TOOL_SAVE_STATE_URL, json=payload)
        if response.status_code == 200:
            print("✅ Agent 4 complete. State persisted to ASP.NET Core.")
        else:
            print("❌ Agent 4 failed to save state to ASP.NET Core.")
    except Exception as e:
         print(f"❌ Network Error in Agent 4: {e}")
         
    return state

# ==========================================
# 4. LANGGRAPH WORKFLOW BUILDER
# ==========================================

# Define routing logic (Conditional Edges)
def check_validation_routing(state: AgentState):
    if state.get("workflow_status") == "COMPLETED_NO_ACTION" or state.get("workflow_status") == "FAILED":
        return "coordinator"
    if state.get("validation_passed"):
        return "coordinator"
    else:
        return "strategist" # Retry mechanism

# Build the Graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("analyst", inventory_analyst_agent)
workflow.add_node("strategist", campaign_strategist_agent)
workflow.add_node("validator", safety_validator_agent)
workflow.add_node("coordinator", coordinator_agent)

# Define Edges
workflow.add_edge(START, "analyst")  # <--- FIXED: THIS IS THE MISSING LINE!
workflow.add_edge("analyst", "strategist")
workflow.add_edge("strategist", "validator")
workflow.add_conditional_edges("validator", check_validation_routing, {
    "coordinator": "coordinator",
    "strategist": "strategist" # Iterative retry if LLM fails safety checks
})
workflow.add_edge("coordinator", END)

# Compile Graph
workflow_app = workflow.compile()

# =====================================================================
# WORKFLOW 2: DELIVERY DISPUTE ADJUDICATOR (NEW for Student 2)
# =====================================================================
class DisputeState(TypedDict):
    objective: str
    pending_disputes: List[Dict]
    policy_analysis: str
    proposed_resolutions: Optional[List[Dict]]
    validation_passed: bool
    validation_errors: str
    workflow_status: str

# --- AGENT 1: Context Gatherer ---
def context_gatherer_agent(state: DisputeState):
    print("🤖 W2-Agent 1 (Context Gatherer): Fetching open complaints and loyalty metrics...")
    try:
        response = requests.get(TOOL_DISPUTES_URL)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and "message" in data:
                state["workflow_status"] = "COMPLETED_NO_ACTION"
                state["policy_analysis"] = "No open complaints require adjudication."
                state["pending_disputes"] = []
                return state

            state["pending_disputes"] = data
            state["workflow_status"] = "RUNNING"
            print(f"✅ Agent 1 found {len(data)} pending disputes.")
        else:
            state["workflow_status"] = "FAILED"
            state["validation_errors"] = "Failed to fetch disputes from ASP.NET Core."
    except Exception as e:
        state["workflow_status"] = "FAILED"
        state["validation_errors"] = str(e)
    return state

# --- AGENT 2: Policy Adjudicator ---
def policy_adjudicator_agent(state: DisputeState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]: return state
    print("🤖 W2-Agent 2 (Policy Adjudicator): Analyzing claims against VeloCart Policy...")
    
    disputes_str = json.dumps(state["pending_disputes"], indent=2)
    prompt = PromptTemplate.from_template("""
    You are the VeloCart Customer Ops Policy Adjudicator. Analyze the following customer complaints.
    
    POLICY RULES:
    1. Gold/Platinum members: Give the benefit of the doubt for damages under Rs. 1000. Recommend full refund of the damaged item.
    2. Standard/Silver members: Recommend partial refund or compensatory loyalty points instead of cash, unless the error is severe.
    3. Missing items: Always refund the missing item by looking at the PurchasedItems list.
    
    Disputes:
    {disputes}
    
    Write a brief plain-text policy analysis for these cases.
    """)
    result = llm.invoke(prompt.format(disputes=disputes_str))
    state["policy_analysis"] = result.strip()
    print("✅ Agent 2 completed policy analysis.")
    return state

# --- AGENT 3: Resolution Proposer ---
def resolution_proposer_agent(state: DisputeState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]: return state
    print("🤖 W2-Agent 3 (Resolution Proposer): Drafting structured financial resolutions...")
    
    disputes_str = json.dumps(state["pending_disputes"], indent=2)
    prompt = PromptTemplate.from_template("""
    Based on this policy analysis: {analysis}
    Draft resolutions for these disputes: {disputes}

    RULES: 
    - If refunding a missing or damaged item, look at the "PurchasedItems" list in the dispute data. Find the specific item mentioned in the complaint and calculate the RefundAmount (PricePerUnit).
    - If granting points instead of cash, set CompensatoryPoints (e.g., 500).
    
    Output ONLY a JSON array of objects with EXACTLY these keys:
    [
      {{
        "ComplaintId": 1,
        "RefundAmount": 500.0,
        "CompensatoryPoints": 0,
        "ResolutionNotes": "Refunded Rs 500 for the missing item."
      }}
    ]
    Do not include markdown tags like ```json. Output raw JSON array only.
    """)
    result = llm.invoke(prompt.format(analysis=state["policy_analysis"], disputes=disputes_str))
    try:
        # 1. Standard cleanup
        cleaned_result = result.strip().replace("```json", "").replace("```", "")
        
        # 2. THE FIX: Aggressively extract ONLY what is between the brackets [ ]
        start_idx = cleaned_result.find("[")
        end_idx = cleaned_result.rfind("]") + 1
        if start_idx != -1 and end_idx != 0:
            cleaned_result = cleaned_result[start_idx:end_idx]
            
        # 3. Load the clean JSON
        state["proposed_resolutions"] = json.loads(cleaned_result)
        print("✅ Agent 3 drafted resolutions.")
        
    except Exception as e:
        state["workflow_status"] = "FAILED"
        state["validation_errors"] = f"Agent 3 produced invalid JSON: {result}"
        print("❌ Agent 3 Failed:", str(e))
    return state

# --- AGENT 4: Compliance Validator & Coordinator ---
def compliance_validator_agent(state: DisputeState):
    print("🤖 W2-Agent 4 (Compliance Validator): Running deterministic financial checks...")
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]:
        payload = { "WorkflowName": state["objective"], "Status": state.get("workflow_status"), "ExecutionSummary": state.get('validation_errors', state.get('policy_analysis')), "ProposedPayload": None }
        requests.post(TOOL_SAVE_STATE_URL, json=payload)
        return state

    resolutions = state["proposed_resolutions"]
    disputes = {d["complaintId"]: d for d in state["pending_disputes"]}
    errors = []

    if not isinstance(resolutions, list):
        errors.append("Proposed resolution is not a JSON array.")
    else:
        for res in resolutions:
            c_id = res.get("ComplaintId")
            refund = res.get("RefundAmount", 0)
            pts = res.get("CompensatoryPoints", 0)
            
            if c_id not in disputes:
                errors.append(f"Invalid ComplaintId {c_id}")
                continue
                
            grand_total = disputes[c_id]["orderGrandTotal"]
            if refund > grand_total:
                errors.append(f"Safety Violation (Complaint {c_id}): Refund {refund} exceeds Order Total {grand_total}")
            if pts < 0 or refund < 0:
                errors.append(f"Safety Violation: Negative values not allowed.")

    if errors:
        state["validation_passed"] = False
        state["validation_errors"] = " | ".join(errors)
        print("❌ Agent 4 rejected resolutions.")
        # Save safe failure
        payload = { "WorkflowName": state["objective"], "Status": "FAILED", "ExecutionSummary": state["policy_analysis"], "ProposedPayload": json.dumps({"errors": errors}) }
    else:
        state["validation_passed"] = True
        print("✅ Agent 4 validated resolutions. Pausing for HITL.")
        payload = { "WorkflowName": state["objective"], "Status": "PENDING_APPROVAL", "ExecutionSummary": state["policy_analysis"], "ProposedPayload": json.dumps(resolutions) }

    try:
        requests.post(TOOL_SAVE_STATE_URL, json=payload)
    except Exception as e:
        print(f"❌ Network Error: {e}")
    return state

def check_dispute_routing(state: DisputeState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"] or state.get("validation_passed"): return END
    return "proposer" # Loop back to Agent 3 to fix JSON if needed

dispute_workflow = StateGraph(DisputeState)
dispute_workflow.add_node("gatherer", context_gatherer_agent)
dispute_workflow.add_node("adjudicator", policy_adjudicator_agent)
dispute_workflow.add_node("proposer", resolution_proposer_agent)
dispute_workflow.add_node("validator", compliance_validator_agent)
dispute_workflow.add_edge(START, "gatherer")
dispute_workflow.add_edge("gatherer", "adjudicator")
dispute_workflow.add_edge("adjudicator", "proposer")
dispute_workflow.add_edge("proposer", "validator")
dispute_workflow.add_conditional_edges("validator", check_dispute_routing)
dispute_app = dispute_workflow.compile()

# =====================================================================
# WORKFLOW 3: PREDICTIVE ERP REPLENISHMENT (NEW)
# =====================================================================
class SupplyChainState(TypedDict):
    objective: str
    demand_forecast: List[Dict]
    supplier_catalog: List[Dict]
    analysis_report: str
    proposed_po: Optional[Dict]
    validation_passed: bool
    validation_errors: str
    workflow_status: str

def demand_forecaster_agent(state: SupplyChainState):
    print("🤖 W3-Agent 1 (Demand Forecaster): Predicting zero-stock dates...")
    try:
        response = requests.get(TOOL_DEMAND_URL)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and "message" in data:
                state["workflow_status"] = "COMPLETED_NO_ACTION"
                state["analysis_report"] = data["message"]
                return state
            state["demand_forecast"] = data
            state["workflow_status"] = "RUNNING"
            print(f"✅ Agent 1 identified {len(data)} variants nearing stockout.")
        else: state["workflow_status"] = "FAILED"
    except Exception as e:
        state["workflow_status"] = "FAILED"; state["validation_errors"] = str(e)
    return state

def supplier_analyst_agent(state: SupplyChainState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]: return state
    print("🤖 W3-Agent 2 (Supplier Analyst): Evaluating supplier prices and lead times...")
    try:
        response = requests.get(TOOL_SUPPLIER_URL)
        if response.status_code == 200:
            catalog = response.json()
            state["supplier_catalog"] = catalog
            
            prompt = PromptTemplate.from_template("""
            You are the VeloCart Supplier Analyst based in Sri Lanka. 
            Demand Forecast (Items running out): {demand}
            Supplier Catalog: {catalog}
            
            Write a brief plain-text analysis recommending which supplier to choose for the required items. 
            Prioritize the cheapest 'PurchasePrice', but if the 'DaysUntilZeroStock' is less than the supplier's 'LeadTimeDays', you must pick a faster supplier!

            CRITICAL RULES:
            1. All currency values MUST be formatted as Sri Lankan Rupees (e.g., Rs. 250). Do NOT use the $ symbol.
            2. Do not use markdown.
            """)
            result = llm.invoke(prompt.format(demand=json.dumps(state["demand_forecast"]), catalog=json.dumps(catalog)))
            state["analysis_report"] = result.strip()
            print("✅ Agent 2 completed supplier negotiation analysis.")
        else: state["workflow_status"] = "FAILED"
    except Exception as e:
        state["workflow_status"] = "FAILED"; state["validation_errors"] = str(e)
    return state

def po_drafter_agent(state: SupplyChainState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]: return state
    print("🤖 W3-Agent 3 (PO Drafter): Constructing Purchase Order JSON...")
    current_date = datetime.now().strftime("%Y-%m-%d")
    prompt = PromptTemplate.from_template("""
    Analysis: {analysis}
    Demand: {demand}
    Catalog: {catalog}
    
    Draft a Purchase Order for ONE supplier. You must order enough to cover 30 days of the 'DailyBurnRate'.
    Make sure 'OrderedQuantity' is greater than or equal to the supplier's 'MinimumOrderQuantity'.
    ExpectedDeliveryDate should be formatted as YYYY-MM-DD. Delivery date should be a future date only.
    Current date is {current_date}. 
    Assume all prices are in Rs.
    
    Output ONLY valid JSON matching this structure:
    {{
      "SupplierId": 1,
      "ExpectedDeliveryDate": "2026-10-01",
      "Items": [
         {{
            "ProductVariantId": 5,
            "OrderedQuantity": 100,
            "PurchasePrice": 45.50
         }}
      ]
    }}
    Do not use markdown tags like ```json. Output raw JSON only.
    """)
    result = llm.invoke(prompt.format(analysis=state["analysis_report"], demand=json.dumps(state["demand_forecast"]), catalog=json.dumps(state["supplier_catalog"]), current_date=current_date))
    try:
        cleaned_result = result.strip().replace("```json", "").replace("```", "")
        
        # NOTE: Using { } because this agent returns a JSON Object
        start_idx = cleaned_result.find("{")
        end_idx = cleaned_result.rfind("}") + 1
        if start_idx != -1 and end_idx != 0:
            cleaned_result = cleaned_result[start_idx:end_idx]
            
        state["proposed_po"] = json.loads(cleaned_result)
        print("✅ Agent 3 drafted Purchase Order.")
    except Exception as e:
        state["workflow_status"] = "FAILED"
        state["validation_errors"] = f"Agent 3 Invalid JSON: {result}"
        print("❌ Agent 3 Failed:", str(e))
        
    return state

def budget_validator_agent(state: SupplyChainState):
    print("🤖 W3-Agent 4 (Budget & Safety Checker): Deterministically validating PO constraints...")
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]:
        payload = { "WorkflowName": state["objective"], "Status": state.get("workflow_status"), "ExecutionSummary": state.get('validation_errors', state.get('analysis_report')), "ProposedPayload": None }
        requests.post(TOOL_SAVE_STATE_URL, json=payload)
        return state

    po = state["proposed_po"]
    errors = []
    
    # Deterministic Business Rules (Budget Ceiling = 500,000)
    if not isinstance(po, dict) or "Items" not in po:
        errors.append("Invalid PO Schema.")
    else:
        total_cost = sum([item.get("OrderedQuantity", 0) * item.get("PurchasePrice", 0) for item in po["Items"]])
        if total_cost > 500000:
            errors.append(f"BUDGET VIOLATION: Drafted PO total (Rs. {total_cost}) exceeds the global limit of Rs. 500,000.")
        if len(po["Items"]) == 0:
            errors.append("PO contains no items.")

    if errors:
        state["validation_passed"] = False
        print(f"❌ Agent 4 rejected PO. Errors: {errors}")
        payload = { "WorkflowName": state["objective"], "Status": "FAILED", "ExecutionSummary": state["analysis_report"], "ProposedPayload": json.dumps({"errors": errors}) }
    else:
        state["validation_passed"] = True
        print("✅ Agent 4 validated PO. Budget check passed. Pausing for HITL.")
        payload = { "WorkflowName": state["objective"], "Status": "PENDING_APPROVAL", "ExecutionSummary": state["analysis_report"], "ProposedPayload": json.dumps(po) }

    try: requests.post(TOOL_SAVE_STATE_URL, json=payload)
    except Exception as e: print(f"❌ Network Error: {e}")
    return state

def check_po_routing(state: SupplyChainState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"] or state.get("validation_passed"): return END
    return "drafter"

po_workflow = StateGraph(SupplyChainState)
po_workflow.add_node("forecaster", demand_forecaster_agent)
po_workflow.add_node("analyst", supplier_analyst_agent)
po_workflow.add_node("drafter", po_drafter_agent)
po_workflow.add_node("validator", budget_validator_agent)
po_workflow.add_edge(START, "forecaster")
po_workflow.add_edge("forecaster", "analyst")
po_workflow.add_edge("analyst", "drafter")
po_workflow.add_edge("drafter", "validator")
po_workflow.add_conditional_edges("validator", check_po_routing)
po_app = po_workflow.compile()

# =====================================================================
# WORKFLOW 4: CATALOG TAX COMPLIANCE AUDITOR (NEW)
# =====================================================================
class ComplianceState(TypedDict):
    objective: str
    unmapped_products: List[Dict]
    active_taxes: List[Dict]
    classification_report: str
    impact_report: str
    proposed_mappings: Optional[List[Dict]]
    validation_passed: bool
    validation_errors: str
    workflow_status: str

def catalog_scanner_agent(state: ComplianceState):
    print("🤖 W4-Agent 1 (Catalog Scanner): Sweeping database for unmapped products...")
    try:
        prod_response = requests.get(TOOL_UNMAPPED_URL)
        tax_response = requests.get(TOOL_TAXES_URL)
        
        if prod_response.status_code == 200 and tax_response.status_code == 200:
            prod_data = prod_response.json()
            if isinstance(prod_data, dict) and "message" in prod_data:
                state["workflow_status"] = "COMPLETED_NO_ACTION"
                state["impact_report"] = prod_data["message"]
                return state
                
            state["unmapped_products"] = prod_data
            state["active_taxes"] = tax_response.json()
            state["workflow_status"] = "RUNNING"
            print(f"✅ Agent 1 found {len(prod_data)} products requiring tax classification.")
        else: state["workflow_status"] = "FAILED"
    except Exception as e:
        state["workflow_status"] = "FAILED"; state["validation_errors"] = str(e)
    return state

def semantic_classifier_agent(state: ComplianceState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]: return state
    print("🤖 W4-Agent 2 (Semantic Classifier): Analyzing product semantics...")
    
    prompt = PromptTemplate.from_template("""
    You are the VeloCart Finance & Compliance AI.
    Unmapped Products: {products}
    Available Tax Rules: {taxes}
    
    Match each product to the most logical TaxRuleId based on its Name, Brand, Category, and Description. 
    Write a brief report explaining your classifications. Do not use markdown tags.
    """)
    result = llm.invoke(prompt.format(products=json.dumps(state["unmapped_products"]), taxes=json.dumps(state["active_taxes"])))
    state["classification_report"] = result.strip()
    print("✅ Agent 2 completed semantic classification.")
    return state

def impact_simulator_agent(state: ComplianceState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]: return state
    print("🤖 W4-Agent 3 (Impact Simulator): Calculating tax impact and drafting JSON...")
    
    prompt = PromptTemplate.from_template("""
    Based on your classification: {report}
    Products: {products}
    Taxes: {taxes}
    
    Calculate the new effective price for the customer (BasePrice + Tax).
    Output ONLY a raw JSON array matching this exact C# DTO structure:
    [
      {{
        "ProductId": 1,
        "TaxRuleId": 2,
        "Justification": "Classified as Beverage. New effective price: Rs. 250."
      }}
    ]
    Do not include markdown tags like ```json. Output raw JSON only.
    """)
    result = llm.invoke(prompt.format(report=state["classification_report"], products=json.dumps(state["unmapped_products"]), taxes=json.dumps(state["active_taxes"])))
    
    try:
        cleaned_result = result.strip().replace("```json", "").replace("```", "")
        
        # NOTE: Using [ ] because this agent returns a JSON Array
        start_idx = cleaned_result.find("[")
        end_idx = cleaned_result.rfind("]") + 1
        if start_idx != -1 and end_idx != 0:
            cleaned_result = cleaned_result[start_idx:end_idx]
            
        state["proposed_mappings"] = json.loads(cleaned_result)
        state["impact_report"] = state["classification_report"]
        print("✅ Agent 3 simulated impacts and drafted mappings.")
    except Exception as e:
        state["workflow_status"] = "FAILED"
        state["validation_errors"] = "Agent 3 Invalid JSON."
        print("❌ Agent 3 Failed:", str(e))
        
    return state

def schema_validator_agent(state: ComplianceState):
    print("🤖 W4-Agent 4 (Schema Validator): Deterministically checking compliance schema...")
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"]:
        payload = { "WorkflowName": state["objective"], "Status": state.get("workflow_status"), "ExecutionSummary": state.get('validation_errors', state.get('impact_report')), "ProposedPayload": None }
        requests.post(TOOL_SAVE_STATE_URL, json=payload)
        return state

    mappings = state["proposed_mappings"]
    errors = []
    
    if not isinstance(mappings, list):
        errors.append("Invalid Mapping Schema: Must be a JSON array.")
    else:
        for m in mappings:
            if "ProductId" not in m or "TaxRuleId" not in m:
                errors.append(f"Missing required properties in mapping: {m}")
            if not isinstance(m.get("TaxRuleId"), int):
                errors.append(f"TaxRuleId must be an integer: {m}")

    if errors:
        state["validation_passed"] = False
        payload = { "WorkflowName": state["objective"], "Status": "FAILED", "ExecutionSummary": state["classification_report"], "ProposedPayload": json.dumps({"errors": errors}) }
        print(f"❌ Agent 4 rejected mappings. Errors: {errors}")
    else:
        state["validation_passed"] = True
        payload = { "WorkflowName": state["objective"], "Status": "PENDING_APPROVAL", "ExecutionSummary": state["impact_report"], "ProposedPayload": json.dumps(mappings) }
        print("✅ Agent 4 validated mappings. Pausing for HITL.")

    try: requests.post(TOOL_SAVE_STATE_URL, json=payload)
    except Exception as e: print(f"❌ Network Error: {e}")
    return state

def check_compliance_routing(state: ComplianceState):
    if state.get("workflow_status") in ["COMPLETED_NO_ACTION", "FAILED"] or state.get("validation_passed"): return END
    return "simulator"

compliance_workflow = StateGraph(ComplianceState)
compliance_workflow.add_node("scanner", catalog_scanner_agent)
compliance_workflow.add_node("classifier", semantic_classifier_agent)
compliance_workflow.add_node("simulator", impact_simulator_agent)
compliance_workflow.add_node("validator", schema_validator_agent)
compliance_workflow.add_edge(START, "scanner")
compliance_workflow.add_edge("scanner", "classifier")
compliance_workflow.add_edge("classifier", "simulator")
compliance_workflow.add_edge("simulator", "validator")
compliance_workflow.add_conditional_edges("validator", check_compliance_routing)
compliance_app = compliance_workflow.compile()

# =====================================================================
# WORKFLOW 5: CUSTOMER UTILITY AGENT (B2C CONVERSATIONAL)
# =====================================================================
TOOL_CUSTOMER_CONTEXT_URL = f"{CSHARP_BASE_URL}/CustomerAgent/context"
TOOL_SEARCH_CATALOG_URL = f"{CSHARP_BASE_URL}/CustomerAgent/search"

class CustomerChatState(TypedDict):
    user_id: int
    customer_message: str
    customer_context: str
    search_results: str
    ai_chat_response: str
    proposed_cart: Optional[List[Dict]]
    workflow_status: str

def customer_context_agent(state: CustomerChatState):
    print(f"💬 W5-Agent 1 (Context Gatherer): Fetching profile for User {state['user_id']}...")
    try:
        res = requests.get(f"{TOOL_CUSTOMER_CONTEXT_URL}/{state['user_id']}")
        if res.status_code == 200:
            state["customer_context"] = json.dumps(res.json())
        else:
            state["customer_context"] = "No context available."
    except Exception:
        state["customer_context"] = "Error fetching context."
    return state

def search_planner_agent(state: CustomerChatState):
    print("💬 W5-Agent 2 (Search Planner): Extracting multi-item shopping list...")
    prompt = PromptTemplate.from_template("""
    Customer message: '{message}'
    Extract a comma-separated list of searchable grocery items/ingredients from the customer's message (e.g., prawns, chicken, onion, celery, eggs, curd).
    Output ONLY the comma-separated terms. If none, output 'NONE'.
    """)
    terms_str = llm.invoke(prompt.format(message=state["customer_message"])).strip()
    
    search_results_dict = {}
    if terms_str != "NONE" and terms_str != "":
        terms = [t.strip() for t in terms_str.split(",") if t.strip()]
        for term in terms:
            print(f"🔍 Searching catalog for item: {term}")
            try:
                res = requests.get(f"{TOOL_SEARCH_CATALOG_URL}?query={term}")
                if res.status_code == 200:
                    search_results_dict[term] = res.json()
            except Exception as e:
                print(f"⚠️ Search failed for {term}: {e}")
                
    state["search_results"] = json.dumps(search_results_dict) if search_results_dict else "No matching products found in catalog."
    return state

def response_generator_agent(state: CustomerChatState):
    print("💬 W5-Agent 3 (Response Drafter): Generating flexible response and normalizing cart...")
    prompt = PromptTemplate.from_template("""
    You are the VeloCart AI Supermarket Assistant in Sri Lanka.
    Customer Message: {message}
    Customer Context: {context}
    Catalog Search Results (Inventory match): {search}
    
    Your goal is to be fully flexible and transparent:
    1. Acknowledge everything the customer asked for (whether available in stock or not).
    2. Clearly state which items were found in stock (with their real IDs and prices from the search results) and which items could not be found or are out of stock.
    3. Propose a cart containing ONLY the items that were successfully found in stock in the search results.
    4. Format prices as 'Rs. X'.
    5. You MUST output your response in two parts separated by '---JSON---'.
    
    6. If the customer asks for help, complains, or needs to speak with a human/support, redirect them to Technical Support: Phone: +94 33 999 9999, Email: support@velocart.com
    
    Part 1: Friendly conversational breakdown of what's available vs what's missing.
    Part 2: JSON array of available items to add to the cart. Each object must contain:
       - "productVariantId" (the exact numeric ID from search results)
       - "productName" (the exact name from search results)
       - "quantity" (default 1)
    If no items are available to add, output [].
    
    Example Response:
    I found prawns, chicken, and onions in stock for you! However, celery and curd are currently unavailable in our catalog. Would you like me to add the available items to your cart?
    ---JSON---
    [
        {{"productVariantId": 145, "productName": "Prawns 500g", "quantity": 1}},
        {{"productVariantId": 150, "productName": "Chicken Breast 1kg", "quantity": 1}}
    ]
    """)
    
    result = llm.invoke(prompt.format(
        message=state["customer_message"],
        context=state["customer_context"],
        search=state["search_results"]
    ))
    
    parts = result.split("---JSON---")
    state["ai_chat_response"] = parts[0].strip()
    
    # ========================================================
    # BULLETPROOF PYTHON-SIDE KEY NORMALIZATION
    # ========================================================
    state["proposed_cart"] = []
    if len(parts) > 1:
        try:
            clean_json = parts[1].strip().replace("```json", "").replace("```", "")
            start_idx = clean_json.find("[")
            end_idx = clean_json.rfind("]") + 1
            if start_idx != -1 and end_idx != 0:
                clean_json = clean_json[start_idx:end_idx]
                
            parsed_items = json.loads(clean_json)
            normalized_items = []
            for item in parsed_items:
                # Extract ID and Name regardless of how the LLM capitalized them
                vid = item.get("productVariantId") or item.get("ProductVariantId") or item.get("id") or item.get("Id")
                name = item.get("productName") or item.get("ProductName") or item.get("name") or item.get("Name")
                qty = item.get("quantity") or item.get("Quantity") or item.get("qty") or 1
                
                if vid is not None:
                    # Inject ALL possible key variations so the React frontend never fails
                    normalized_items.append({
                        "productVariantId": int(vid),
                        "ProductVariantId": int(vid),
                        "id": int(vid),
                        "productName": str(name),
                        "ProductName": str(name),
                        "quantity": int(qty),
                        "Quantity": int(qty)
                    })
            state["proposed_cart"] = normalized_items
            print(f"✅ Successfully normalized {len(normalized_items)} cart items.")
        except Exception as e:
            print("❌ Failed to parse/normalize AI JSON:", e)
            
    state["workflow_status"] = "COMPLETED"
    print("✅ AI Chat Response Generated.")
    return state

chat_workflow = StateGraph(CustomerChatState)
chat_workflow.add_node("context", customer_context_agent)
chat_workflow.add_node("search", search_planner_agent)
chat_workflow.add_node("respond", response_generator_agent)
chat_workflow.add_edge(START, "context")
chat_workflow.add_edge("context", "search")
chat_workflow.add_edge("search", "respond")
chat_workflow.add_edge("respond", END)
chat_app = chat_workflow.compile()

# ==========================================
# 5. FASTAPI ROUTES (Agent Integration)
# ==========================================

class StartWorkflowRequest(BaseModel):
    objective: str 

@app.post("/start-optimizer")
def start_optimizer(request: StartWorkflowRequest):
    # Initialize the shared state
    initial_state = AgentState(
        objective=request.objective,
        expiring_batches=[],
        analysis_report="",
        proposed_promotion=None,
        validation_passed=True,
        validation_errors="",
        workflow_status="RUNNING"
    )
    
    # Execute the LangGraph workflow
    # Note: In production, this would be an async background task to prevent API timeout.
    # We use invoke() here for immediate lab demonstration.
    final_state = workflow_app.invoke(initial_state)
    
    return {
        "message": "Workflow 1 execution complete.",
        "status": final_state.get("workflow_status"),
        "errors": final_state.get("validation_errors")
    }

@app.post("/start-adjudicator")
def start_adjudicator(request: StartWorkflowRequest):
    initial_state = DisputeState(objective=request.objective, pending_disputes=[], policy_analysis="", proposed_resolutions=None, validation_passed=True, validation_errors="", workflow_status="RUNNING")
    final_state = dispute_app.invoke(initial_state)
    return { "message": "Workflow 2 complete.", "status": final_state.get("workflow_status"), "errors": final_state.get("validation_errors") }

@app.post("/start-po-generator")
def start_po_generator(request: StartWorkflowRequest):
    initial_state = SupplyChainState(objective=request.objective, demand_forecast=[], supplier_catalog=[], analysis_report="", proposed_po=None, validation_passed=True, validation_errors="", workflow_status="RUNNING")
    final_state = po_app.invoke(initial_state)
    return { "message": "Workflow 3 complete.", "status": final_state.get("workflow_status") }

@app.post("/start-compliance")
def start_compliance(request: StartWorkflowRequest):
    initial_state = ComplianceState(objective=request.objective, unmapped_products=[], active_taxes=[], classification_report="", impact_report="", proposed_mappings=None, validation_passed=True, validation_errors="", workflow_status="RUNNING")
    final_state = compliance_app.invoke(initial_state)
    return { "message": "Workflow 4 complete.", "status": final_state.get("workflow_status") }

class ChatRequest(BaseModel):
    userId: int
    message: str

@app.post("/customer-chat")
def customer_chat(request: ChatRequest):
    initial_state = CustomerChatState(
        user_id=request.userId, customer_message=request.message, customer_context="",
        search_results="", ai_chat_response="", proposed_cart=None, workflow_status="RUNNING"
    )
    final_state = chat_app.invoke(initial_state)
    return {
        "reply": final_state.get("ai_chat_response"),
        "proposedCart": final_state.get("proposed_cart")
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)