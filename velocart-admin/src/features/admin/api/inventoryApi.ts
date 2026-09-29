import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { 
        headers: { Authorization: `Bearer ${token}` } 
    };
};

// ==========================================
// AI ERP REPLENISHMENT AGENT
// ==========================================
export const getPendingERPWorkflows = async () => {
    const response = await axios.get(`${API_URL}/AgentWorkflow/pending`, getAuthHeader());
    return response.data;
};

export const triggerERPAIWorkflow = async () => {
    const response = await axios.post(`${API_URL}/AgentWorkflow/trigger-erp`, {}, getAuthHeader());
    return response.data;
};

export const updateWorkflowStatus = async (id: number, status: string) => {
    const response = await axios.put(`${API_URL}/AgentWorkflow/${id}/status`, `"${status}"`, {
        headers: { ...getAuthHeader().headers, 'Content-Type': 'application/json' }
    });
    return response.data;
};

// ==========================================
// STANDARD INVENTORY & PO OPERATIONS
// ==========================================
export const createPurchaseOrder = async (payload: any) => {
    const response = await axios.post(`${API_URL}/inventory/purchase-orders`, payload, getAuthHeader());
    return response.data;
};