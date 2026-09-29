import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { 
        headers: { 
            Authorization: `Bearer ${token}` 
        } 
    };
};

// ==========================================
// PROMOTIONS
// ==========================================
export const getPromotions = async () => {
    const response = await axios.get(`${API_URL}/promotions`, getAuthHeader());
    return response.data;
};

export const createPromotion = async (data: any) => {
    const response = await axios.post(`${API_URL}/promotions`, data, getAuthHeader());
    return response.data;
};

export const updatePromotionStatus = async (id: number, status: string) => {
    const response = await axios.put(`${API_URL}/promotions/${id}/status`, { status }, getAuthHeader());
    return response.data;
};

export const deletePromotion = async (id: number) => {
    const response = await axios.delete(`${API_URL}/promotions/${id}`, getAuthHeader());
    return response.data;
};

// ==========================================
// TAXES
// ==========================================
export const getTaxRules = async () => {
    const response = await axios.get(`${API_URL}/taxes`, getAuthHeader());
    return response.data;
};

export const createTaxRule = async (data: any) => {
    const response = await axios.post(`${API_URL}/taxes`, data, getAuthHeader());
    return response.data;
};

export const deleteTaxRule = async (id: number) => {
    const response = await axios.delete(`${API_URL}/taxes/${id}`, getAuthHeader());
    return response.data;
};

// ==========================================
// LOYALTY REPORTS (SRS 7.7)
// ==========================================
export const getLoyaltySummaryReport = async () => {
    const response = await axios.get(`${API_URL}/loyaltyreports/summary`, getAuthHeader());
    return response.data;
};

// ==========================================
// CUSTOMER DIRECTORY (SRS 7.6)
// ==========================================
export const getLoyaltyCustomersByTier = async (tier: string, page: number = 1, pageSize: number = 5) => {
    const response = await axios.get(`${API_URL}/loyaltyreports/customers?tier=${tier}&page=${page}&pageSize=${pageSize}`, getAuthHeader());
    return response.data;
};

// ==========================================
// NEW: PHASE 4 TARGETING & ASSIGNMENTS
// ==========================================
export const updatePromotion = async (id: number, data: any) => {
    const response = await axios.put(`${API_URL}/promotions/${id}`, data, getAuthHeader());
    return response.data;
};

export const assignPromotionToCustomer = async (promotionId: number, customerId: number) => {
    const response = await axios.post(`${API_URL}/promotions/${promotionId}/assign`, { customerId }, getAuthHeader());
    return response.data;
};

export const getLoyaltyTiersForTargeting = async () => {
    const response = await axios.get(`${API_URL}/promotions/loyalty-tiers`, getAuthHeader());
    return response.data;
};

export const getCatalogForTargeting = async () => {
    // Helper to get Categories and Products for the multi-select checkboxes
    const [cats, prods] = await Promise.all([
        axios.get(`${API_URL}/catalog/categories`),
        axios.get(`${API_URL}/catalog/products`)
    ]);
    return { categories: cats.data, products: prods.data };
};


// ==========================================
// LOYALTY RULES CONFIGURATION (SRS 6.1.4, 7.1)
// ==========================================
export const getLoyaltyRules = async () => {
    const response = await axios.get(`${API_URL}/loyaltyadmin/rules`, getAuthHeader());
    return response.data;
};

export const updateLoyaltyRule = async (id: number, data: any) => {
    const response = await axios.put(`${API_URL}/loyaltyadmin/rules/${id}`, data, getAuthHeader());
    return response.data;
};

// ==========================================
// DELIVERY / EXTRA CHARGES (SRS 2.25)
// ==========================================
export const getProductCharges = async () => {
    const response = await axios.get(`${API_URL}/productcharges`, getAuthHeader());
    return response.data;
};

export const createProductCharge = async (data: any) => {
    const response = await axios.post(`${API_URL}/productcharges`, data, getAuthHeader());
    return response.data;
};

export const updateProductCharge = async (id: number, data: any) => {
    const response = await axios.put(`${API_URL}/productcharges/${id}`, data, getAuthHeader());
    return response.data;
};

export const deleteProductCharge = async (id: number) => {
    const response = await axios.delete(`${API_URL}/productcharges/${id}`, getAuthHeader());
    return response.data;
};

// ==========================================
// AGENTIC AI WORKFLOWS
// ==========================================
export const getPendingWorkflows = async () => {
    const response = await axios.get(`${API_URL}/AgentWorkflow/pending`, getAuthHeader());
    return response.data;
};

export const updateWorkflowStatus = async (id: number, status: string) => {
    // Note: C# [FromBody] string requires the string to be wrapped in quotes
    const response = await axios.put(`${API_URL}/AgentWorkflow/${id}/status`, `"${status}"`, {
        headers: { ...getAuthHeader().headers, 'Content-Type': 'application/json' }
    });
    return response.data;
};

export const triggerAIWorkflow = async () => {
    const response = await axios.post(`${API_URL}/AgentWorkflow/trigger`, {}, getAuthHeader());
    return response.data;
};

// ==========================================
// AI COMPLIANCE AUDITOR
// ==========================================
export const triggerComplianceAIWorkflow = async () => {
    const response = await axios.post(`${API_URL}/AgentWorkflow/trigger-compliance`, {}, getAuthHeader());
    return response.data;
};

export const executeBulkTaxMappings = async (mappings: any[]) => {
    const response = await axios.post(`${API_URL}/Taxes/bulk-map`, mappings, getAuthHeader());
    return response.data;
};

export const createLoyaltyRule = async (data: any) => {
    const response = await axios.post(`${API_URL}/loyaltyadmin/rules`, data, getAuthHeader());
    return response.data;
};