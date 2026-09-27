sed -i 's/import { ReactNode } from "react";/import type { ReactNode } from "react";/' App.tsx

# Fix React unused in files
for f in features/Loyalty/component/LoyaltyDashboard.tsx features/admin/components/RealTimeInventoryDashboard.tsx features/catalog/components/CartDrawer.tsx features/catalog/components/ProductDetails.tsx; do
    sed -i -E 's/import React,\s*\{/import {/g' $f
    sed -i -E 's/import React\s*,\s*\{/import {/g' $f
    sed -i -E 's/import React from '"'"'react'"'"';//g' $f
done

# Fix Package
sed -i 's/Package,//g' features/Loyalty/component/LoyaltyDashboard.tsx

# Fix CheckCircle2
sed -i 's/CheckCircle2,//g' features/auth/components/Profile.tsx

# Fix User
sed -i 's/User,//g' features/catalog/components/StorefrontAssistant.tsx

# Fix Banknote
sed -i 's/Banknote,//g' features/orders/components/OrderHistory.tsx

# Fix PurchaseOrderManager AlertCircle
# Replace line 3 to include AlertCircle
sed -i '3s/AlertTriangle/AlertTriangle,AlertCircle/' features/admin/components/PurchaseOrderManager.tsx

