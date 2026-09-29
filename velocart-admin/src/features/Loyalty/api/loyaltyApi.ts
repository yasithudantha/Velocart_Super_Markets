// loyaltyApi.ts

// Adjust the base URL and auth header logic to match your existing api setup (like authApi.ts)
const API_BASE_URL = 'http://localhost:5176/api/loyalty';

export interface LoyaltyDashboardData {
    customerName: string;
    loyaltyIdNumber: string;
    currentTier: string;
    status: string;
    expiryDate: string;
    currentPointsBalance: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    totalEligibleSpend: number;
    nextTier: string;
    pointsRequiredForNextTier: number;
    progressPercentage: number;
}

export const getLoyaltyDashboard = async (token: string): Promise<LoyaltyDashboardData> => {
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch loyalty dashboard');
    }

    return await response.json();
};