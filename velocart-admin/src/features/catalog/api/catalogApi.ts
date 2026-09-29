import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

// Helper to inject JWT token into requests
const getAuthHeaders = () => {
    const token = localStorage.getItem('token'); // Assuming you store the JWT here after login
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export interface ProductFilters {
    categoryId?: number;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    brand?: string;
    inStockOnly?: boolean;
    sortBy?: string;
}

export const getCategories = async () => {
    try {
        const response = await axios.get(`${API_URL}/catalog/categories`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to fetch categories.";
    }
};

export const getProducts = async (filters: ProductFilters) => {
    try {
        const params = new URLSearchParams();
        if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.brand) params.append('brand', filters.brand);
        if (filters.inStockOnly) params.append('inStockOnly', 'true');
        if (filters.sortBy) params.append('sortBy', filters.sortBy);

        const response = await axios.get(`${API_URL}/catalog/products?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to fetch products.";
    }
};

export const getProductById = async (id: number) => {
    try {
        const response = await axios.get(`${API_URL}/catalog/products/${id}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to fetch product details.";
    }
};

// SECURED: Removed userId, added auth headers
export const addToCart = async (productVariantId: number, quantity: number) => {
    try {
        const response = await axios.post(`${API_URL}/cart/add`, { 
            productVariantId, 
            quantity 
        }, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to add to cart.";
    }
};

// SECURED: Removed userId from URL, added auth headers
export const getCart = async () => {
    try {
        const response = await axios.get(`${API_URL}/cart`, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to fetch cart.";
    }
};

// SECURED: Added auth headers
export const updateCartItem = async (cartItemId: number, quantity: number) => {
    try {
        const response = await axios.put(`${API_URL}/cart/update/${cartItemId}`, { quantity }, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to update cart item.";
    }
};

// SECURED: Added auth headers
export const removeCartItem = async (cartItemId: number) => {
    try {
        const response = await axios.delete(`${API_URL}/cart/remove/${cartItemId}`, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to remove cart item.";
    }
};

export const checkoutOrder = async (deliveryAddress: string, expectedTotal: number = 0, paymentMethod: string = "CARD", idempotencyKey: string = "", pointsToRedeem: number = 0) => {
    try {
        const response = await axios.post(`${API_URL}/orders/checkout`, { 
            deliveryAddress, 
            deliveryMethod: "STANDARD",
            expectedTotal,
            forceCheckout: true,
            paymentMethod,
            idempotencyKey,
            pointsToRedeem // FIX: Pass loyalty points to C#
        }, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error; 
    }
};

// SECURED: Removed userId from URL, added auth headers
export const getOrderHistory = async () => {
    try {
        const response = await axios.get(`${API_URL}/orders/history`, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data || "Failed to fetch order history.";
    }
};

export const submitComplaint = async (orderId: number, subject: string, description: string, imageFile?: File | null) => {
    try {
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('description', description);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/orders/${orderId}/complaints`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data' // Required for files
            }
        });
        return response.data.message;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to submit complaint";
    }
};

// SECURED: Removed userId from payload, added auth headers
export const submitReview = async (productId: number, rating: number, comment: string) => {
    try {
        const response = await axios.post(`${API_URL}/reviews`, { 
            productId, 
            rating, 
            comment 
        }, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to submit review.";
    }
};

export const getProductReviews = async (productId: number) => {
    try {
        const response = await axios.get(`${API_URL}/reviews/product/${productId}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to fetch product reviews.";
    }
};

// NEW: SMART REORDER
export const reorderItems = async (orderId: number) => {
    try {
        const response = await axios.post(`${API_URL}/orders/${orderId}/reorder`, {}, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data || "Failed to reorder items.";
    }
};

// NEW: CANCEL ORDER
export const cancelOrder = async (orderId: number) => {
    try {
        const response = await axios.put(`${API_URL}/orders/${orderId}/cancel`, {}, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data || "Failed to cancel order.";
    }
};

// NEW: CHOOSE REFUND METHOD
export const chooseRefundMethod = async (complaintId: number, refundMethod: string) => {
    try {
        const response = await axios.put(`${API_URL}/orders/complaints/${complaintId}/choose-refund`, { refundMethod }, getAuthHeaders());
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.message || "Failed to submit refund choice.";
    }
};