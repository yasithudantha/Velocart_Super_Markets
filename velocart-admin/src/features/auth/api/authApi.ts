import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

// ==========================================
// AXIOS SECURITY INTERCEPTOR
// ==========================================
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If token is expired (401) and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const token = localStorage.getItem('token');
                const refreshToken = localStorage.getItem('refreshToken');
                
                if (!token || !refreshToken) throw new Error("No tokens available");

                const res = await axios.post(`${API_URL}/auth/refresh`, { token, refreshToken });
                
                // Save new tokens
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('refreshToken', res.data.refreshToken);
                
                // Update header and retry original request
                originalRequest.headers['Authorization'] = `Bearer ${res.data.token}`;
                return axios(originalRequest);
            } catch (refreshError) {
                // If refresh fails (e.g., Refresh Token expired), force strict logout
                localStorage.clear();
                window.location.href = '/login?session=expired';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

// ==========================================
// API ENDPOINTS
// ==========================================
export const registerUser = async (userData: any) => {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.errors) {
            const firstError = Object.values(error.response.data.errors)[0] as string[];
            throw firstError[0]; 
        }
        if (error.response?.data?.message) throw error.response.data.message;
        throw "Registration failed. Please check your connection.";
    }
};

export const loginUser = async (credentials: any) => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.message) throw error.response.data.message;
        throw "Login failed. Please check your connection.";
    }
};

export const logoutUser = async (userId: number) => {
    try {
        await axios.post(`${API_URL}/auth/logout`, { userId }, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        localStorage.clear();
    } catch (error) {
        localStorage.clear(); // Ensure local session is destroyed even if API fails
    }
};

export const googleAuth = async (idToken: string) => {
    try {
        const response = await axios.post(`${API_URL}/auth/google`, { idToken });
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.message) throw error.response.data.message;
        throw "Google authentication failed. Please try again.";
    }
};

export const verifyEmail = async (token: string) => {
    try {
        const response = await axios.get(`${API_URL}/auth/verify-email?token=${token}`);
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.message) throw error.response.data.message;
        throw "Verification failed. Please check your connection.";
    }
};

export const resendVerification = async (email: string) => {
    try {
        const response = await axios.post(`${API_URL}/auth/resend-verification`, { email });
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.message) throw error.response.data.message;
        throw "Failed to resend verification email.";
    }
};

export const requestPasswordReset = async (email: string) => {
    try {
        const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.message) throw error.response.data.message;
        throw "Failed to request password reset.";
    }
};

export const resetPassword = async (data: any) => {
    try {
        const response = await axios.post(`${API_URL}/auth/reset-password`, data);
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.message) throw error.response.data.message;
        throw "Failed to reset password.";
    }
};