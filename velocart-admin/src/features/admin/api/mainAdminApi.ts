import axios from 'axios';

const API_URL = 'http://localhost:5176/api';
const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export const getUsers = async (search?: string, role?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    
    const response = await axios.get(`${API_URL}/MainAdmin/users?${params.toString()}`, getAuthHeader());
    return response.data;
};

export const createStaffAccount = async (data: any) => {
    const response = await axios.post(`${API_URL}/MainAdmin/staff`, data, getAuthHeader());
    return response.data;
};

export const updateUserStatusRole = async (id: number, data: any) => {
    const response = await axios.put(`${API_URL}/MainAdmin/users/${id}`, data, getAuthHeader());
    return response.data;
};

export const getSecurityHistory = async (id: number) => {
    const response = await axios.get(`${API_URL}/MainAdmin/users/${id}/history`, getAuthHeader());
    return response.data;
};

// STOREFRONT BANNERS
export const getBanners = async () => { const res = await axios.get(`${API_URL}/StorefrontBanners`); return res.data; };
export const createBanner = async (data: any) => { const res = await axios.post(`${API_URL}/StorefrontBanners`, data, getAuthHeader()); return res.data; };
export const deleteBanner = async (id: number) => { const res = await axios.delete(`${API_URL}/StorefrontBanners/${id}`, getAuthHeader()); return res.data; };

// REPORTS
export const getFinancialReport = async () => { const res = await axios.get(`${API_URL}/Reports/financials`, getAuthHeader()); return res.data; };
export const getLogisticsReport = async () => { const res = await axios.get(`${API_URL}/Reports/logistics`, getAuthHeader()); return res.data; };
export const getLoyaltyReport = async () => { const res = await axios.get(`${API_URL}/Reports/loyalty`, getAuthHeader()); return res.data; };
export const getInventoryReport = async () => { const res = await axios.get(`${API_URL}/Reports/inventory`, getAuthHeader()); return res.data; };