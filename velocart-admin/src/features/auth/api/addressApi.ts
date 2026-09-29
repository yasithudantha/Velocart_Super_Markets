import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

// THE FIX: Standardized to use 'token' instead of 'velocart_token'
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { 
        headers: { 
            Authorization: `Bearer ${token}` 
        } 
    };
};

export const getAddresses = async () => {
    const response = await axios.get(`${API_URL}/address`, getAuthHeader());
    return response.data;
};

export const addAddress = async (data: any) => {
    const response = await axios.post(`${API_URL}/address`, data, getAuthHeader());
    return response.data;
};

export const updateAddress = async (id: number, data: any) => {
    const response = await axios.put(`${API_URL}/address/${id}`, data, getAuthHeader());
    return response.data;
};

export const deleteAddress = async (id: number) => {
    const response = await axios.delete(`${API_URL}/address/${id}`, getAuthHeader());
    return response.data;
};