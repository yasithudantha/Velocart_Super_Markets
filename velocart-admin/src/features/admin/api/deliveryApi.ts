import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { 
        headers: { Authorization: `Bearer ${token}` } 
    };
};

// ==========================================
// AI DISPUTE ADJUDICATOR
// ==========================================
export const getPendingDisputeWorkflows = async () => {
    const response = await axios.get(`${API_URL}/AgentWorkflow/pending`, getAuthHeader());
    return response.data;
};

export const triggerDisputeAIWorkflow = async () => {
    const response = await axios.post(`${API_URL}/AgentWorkflow/trigger-adjudicator`, {}, getAuthHeader());
    return response.data;
};

export const updateWorkflowStatus = async (id: number, status: string) => {
    const response = await axios.put(`${API_URL}/AgentWorkflow/${id}/status`, `"${status}"`, {
        headers: { ...getAuthHeader().headers, 'Content-Type': 'application/json' }
    });
    return response.data;
};

export const executeAIResolutions = async (resolutions: any[]) => {
    const response = await axios.post(`${API_URL}/orders/resolve-complaints`, resolutions, getAuthHeader());
    return response.data;
};

// NEW: PROCESS REFUND (Stripe Simulation)
export const processRefund = async (complaintId: number) => {
    const response = await axios.put(`${API_URL}/orders/delivery-management/complaints/${complaintId}/process-refund`, {}, getAuthHeader());
    return response.data;
};