import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

// FIXED: Using the standardized 'token' key from Phase 2
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const getUserProfile = async () => {
    try {
        const response = await axios.get(`${API_URL}/user/profile`, getAuthHeader());
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 401) throw "Unauthorized. Session expired.";
        throw error.response?.data?.message || "Failed to load profile.";
    }
};

export const updateUserProfile = async (profileData: any) => {
    try {
        const response = await axios.put(`${API_URL}/user/profile`, profileData, getAuthHeader());
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 401) throw "Unauthorized. Session expired.";
        throw error.response?.data?.message || "Failed to update profile.";
    }
};

// NEW: Enterprise Security Endpoints
export const changePassword = async (data: any) => {
    try {
        const response = await axios.put(`${API_URL}/user/change-password`, data, getAuthHeader());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to change password.";
    }
};

export const requestEmailChange = async (data: any) => {
    try {
        const response = await axios.post(`${API_URL}/user/request-email-change`, data, getAuthHeader());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to request email change.";
    }
};

export const deleteAccount = async (data: any) => {
    try {
        // Axios delete requests with bodies require the 'data' property in the config object
        const response = await axios.delete(`${API_URL}/user/delete-account`, {
            headers: getAuthHeader().headers,
            data: data
        });
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to delete account.";
    }
};

// ==========================================
// 7. NOTIFICATIONS ENGINE (SRS 6.15)
// ==========================================
export const getMyNotifications = async () => {
    try {
        const response = await axios.get(`${API_URL}/notifications`, getAuthHeader());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to load notifications.";
    }
};

export const markNotificationAsRead = async (id: number) => {
    try {
        await axios.put(`${API_URL}/notifications/${id}/read`, {}, getAuthHeader());
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to update notification.";
    }
};

export const markAllNotificationsAsRead = async () => {
    try {
        await axios.put(`${API_URL}/notifications/read-all`, {}, getAuthHeader());
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to clear notifications.";
    }
};