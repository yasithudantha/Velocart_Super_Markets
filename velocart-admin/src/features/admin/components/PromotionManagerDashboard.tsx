import React,{ useState,useEffect } from 'react';
import { motion,AnimatePresence } from 'framer-motion';
import { 
    Megaphone,Percent,BarChart3,Plus,Trash2,X,Loader2,
    CheckCircle2,AlertCircle,Calendar,Power,Users,Star,DollarSign,Activity,ArrowLeft,Tag,ChevronDown,Edit2,Gift,Settings,Truck,ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
    getPromotions,createPromotion,updatePromotion,updatePromotionStatus,deletePromotion,assignPromotionToCustomer,
    getTaxRules,createTaxRule,deleteTaxRule,getLoyaltySummaryReport,getLoyaltyCustomersByTier,getLoyaltyTiersForTargeting,getCatalogForTargeting,
    getLoyaltyRules,updateLoyaltyRule,getProductCharges,createProductCharge,updateProductCharge,deleteProductCharge,
    getPendingWorkflows,updateWorkflowStatus,triggerAIWorkflow,triggerComplianceAIWorkflow,executeBulkTaxMappings,createLoyaltyRule,
} from '../api/promotionsApi';


export default function PromotionManagerDashboard() {
    const navigate=useNavigate();
    const [activeTab,setActiveTab]=useState<'PROMOTIONS' | 'TAXES' | 'CHARGES' | 'REPORTS' | 'CUSTOMERS' | 'RULES' | 'AI_AGENT'>('PROMOTIONS');
    const [isLoading,setIsLoading]=useState(true);
    const [actionLoading,setActionLoading]=useState<number | null>(null);
    const [toast,setToast]=useState<{message: string,type: 'success' | 'error'} | null>(null);
    
    // AI States
    const [aiWorkflows,setAiWorkflows]=useState<any[]>([]);
    const [isTriggeringAI,setIsTriggeringAI]=useState(false);
    const [isTriggeringCompliance,setIsTriggeringCompliance]=useState(false);

    const [promotions,setPromotions]=useState<any[]>([]);
    const [taxes,setTaxes]=useState<any[]>([]);
    const [charges,setCharges]=useState<any[]>([]);
    const [reportData,setReportData]=useState<any>(null);
    const [loyaltyRules,setLoyaltyRules]=useState<any[]>([]);
    
    const [targetProducts,setTargetProducts]=useState<any[]>([]);
    const [targetCategories,setTargetCategories]=useState<any[]>([]);
    const [targetTiers,setTargetTiers]=useState<any[]>([]);

    const [customers,setCustomers]=useState<any[]>([]);
    const [selectedTier,setSelectedTier]=useState('Silver');
    const [customerPage,setCustomerPage]=useState(1);
    const [hasMoreCustomers,setHasMoreCustomers]=useState(false);
    const [loadingCustomers,setLoadingCustomers]=useState(false);

    const [isPromoModalOpen,setIsPromoModalOpen]=useState(false);
    const [editingPromoId,setEditingPromoId]=useState<number | null>(null);
    const [isTaxModalOpen,setIsTaxModalOpen]=useState(false);
    const [isChargeModalOpen,setIsChargeModalOpen]=useState(false);
    const [editingChargeId,setEditingChargeId]=useState<number | null>(null);

    const [isGiftModalOpen,setIsGiftModalOpen]=useState(false);
    const [giftCustomerId,setGiftCustomerId]=useState<number | null>(null);
    const [selectedGiftPromoId,setSelectedGiftPromoId]=useState<string>('');
    const [isRuleModalOpen,setIsRuleModalOpen]=useState(false);
    const [editingRuleId,setEditingRuleId]=useState<number | null>(null);
    const [isSubmitting,setIsSubmitting]=useState(false);
    const [deletePromoId,setDeletePromoId]=useState<number | null>(null);
    const [deleteTaxId,setDeleteTaxId]=useState<number | null>(null);
    const [deleteChargeId,setDeleteChargeId]=useState<number | null>(null);

    const todayString=new Date().toISOString().split('T')[0];
    const defaultPromoForm={ name: '',description: '',type: 'PERCENTAGE_DISCOUNT',discountValue: '',startDate: todayString,endDate: '',isLoyaltyPromotion: false,minimumSpend: '',buyQuantityX: '',getQuantityY: '',targetBrand: '',productIds: [] as number[],categoryIds: [] as number[],loyaltyRuleIds: [] as number[] };
    const defaultTaxForm={ name: '',ratePercentage: '',startDate: todayString,endDate: '',productIds: [] as number[],categoryIds: [] as number[] };
    const defaultRuleForm={ minimumPoints: 0,maximumPoints: '',currencyAmountPerPoint: 100,maxRedeemablePointsPerOrder: 50000,maxDiscountPercentage: 5,pointExpiryDays: 365,tierEvaluationPeriodDays: 365,tierName: '' };
    const defaultChargeForm={ name: '',chargeType: 'FIXED',amountOrPercentage: '',isActive: true,minOrderAmount: 0,maxOrderAmount: '' };

    const [promoForm,setPromoForm]=useState<any>(defaultPromoForm);
    const [taxForm,setTaxForm]=useState<any>(defaultTaxForm);
    const [ruleForm,setRuleForm]=useState<any>(defaultRuleForm);
    const [chargeForm,setChargeForm]=useState<any>(defaultChargeForm);

    useEffect(() => {
        if(activeTab === 'CUSTOMERS') loadInitialCustomers();
        else fetchData();
    },[activeTab,selectedTier]);

    useEffect(() => {
        getCatalogForTargeting().then(res => { setTargetProducts(res.products); setTargetCategories(res.categories); }).catch(err => console.error("Failed to load catalog targets",err));
        getLoyaltyTiersForTargeting().then(res => setTargetTiers(res || [])).catch(err => console.error("Failed to load tier targets",err));
    },[]);

    const showToast=(message: string,type: 'success' | 'error') => { setToast({ message,type }); setTimeout(() => setToast(null),4000); };

    const fetchData=async () => {
        setIsLoading(true);
        try {
            if(activeTab === 'PROMOTIONS') setPromotions(await getPromotions());
            else if(activeTab === 'TAXES') setTaxes(await getTaxRules());
            else if(activeTab === 'CHARGES') setCharges(await getProductCharges());
            else if(activeTab === 'REPORTS') setReportData(await getLoyaltySummaryReport());
            else if(activeTab === 'RULES') setLoyaltyRules(await getLoyaltyRules());
            else if(activeTab === 'AI_AGENT') {
                const allWorkflows=await getPendingWorkflows();
                // STRICT FILTERING: Only show FEFO and Tax tasks
                const relevantWorkflows=allWorkflows.filter((w: any) => 
                    w.workflowName.includes('FEFO') || 
                    w.workflowName.includes('Audit') || 
                    w.workflowName.includes('tax') ||
                    w.workflowName.includes('protocol')
                );
                setAiWorkflows(relevantWorkflows);
            }
        } catch (err: any) { showToast("Failed to fetch data.","error"); } 
        finally { setIsLoading(false); }
    };

    const loadInitialCustomers=async () => {
        setLoadingCustomers(true);
        try { const res=await getLoyaltyCustomersByTier(selectedTier,1,5); setCustomers(res.customers); setHasMoreCustomers(res.hasMore); setCustomerPage(1); } 
        catch (err) { showToast("Failed to fetch customers.","error"); } 
        finally { setLoadingCustomers(false); setIsLoading(false); }
    };

    const loadMoreCustomers=async () => {
        const nextPage=customerPage + 1;
        setLoadingCustomers(true);
        try { const res=await getLoyaltyCustomersByTier(selectedTier,nextPage,5); setCustomers(prev => [...prev,...res.customers]); setHasMoreCustomers(res.hasMore); setCustomerPage(nextPage); } 
        catch (err) { showToast("Failed to fetch more customers.","error"); } 
        finally { setLoadingCustomers(false); }
    };

    const handleGiftPromo=async () => {
        if(!selectedGiftPromoId || !giftCustomerId) return;
        setIsSubmitting(true);
        try { await assignPromotionToCustomer(Number(selectedGiftPromoId),giftCustomerId); showToast("Promotion successfully gifted to customer!","success"); setIsGiftModalOpen(false); setSelectedGiftPromoId(''); } 
        catch (err: any) { showToast(err.response?.data?.message || err.response?.data || "Failed to assign promotion.","error"); }
        finally { setIsSubmitting(false); }
    };

    // Promotion Logic
    const handleOpenCreatePromo=() => { setEditingPromoId(null); setPromoForm(defaultPromoForm); setIsPromoModalOpen(true); };
    const handleOpenEditPromo=(promo: any) => {
        setEditingPromoId(promo.id);
        setPromoForm({ name: promo.name,description: promo.description,type: promo.type,discountValue: promo.discountValue || '',startDate: promo.startDate.split('T')[0],endDate: promo.endDate.split('T')[0],isLoyaltyPromotion: promo.isLoyaltyPromotion,minimumSpend: promo.minimumSpend || '',buyQuantityX: promo.buyQuantityX || '',getQuantityY: promo.getQuantityY || '',targetBrand: promo.targetBrand || '',productIds: promo.applicableProductIds || [],categoryIds: promo.applicableCategoryIds || [],loyaltyRuleIds: promo.applicableLoyaltyRuleIds || [] });
        setIsPromoModalOpen(true);
    };

    const handleSavePromo=async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const payload={ ...promoForm,discountValue: Number(promoForm.discountValue) || 0,minimumSpend: promoForm.minimumSpend ? Number(promoForm.minimumSpend) : null,buyQuantityX: promoForm.buyQuantityX ? Number(promoForm.buyQuantityX) : null,getQuantityY: promoForm.getQuantityY ? Number(promoForm.getQuantityY) : null,targetBrand: promoForm.targetBrand || null };
            if(editingPromoId) await updatePromotion(editingPromoId,payload);
            else await createPromotion(payload);
            showToast(`Promotion successfully ${editingPromoId ? 'updated' : 'deployed'}!`,"success"); setIsPromoModalOpen(false); setPromoForm(defaultPromoForm); setEditingPromoId(null); fetchData();
        } catch (err: any) { showToast(err.response?.data?.message || err.response?.data || "Failed to save promotion.","error"); } 
        finally { setIsSubmitting(false); }
    };

    const handleTogglePromoStatus=async (id: number,currentStatus: string) => {
        setActionLoading(id);
        const newStatus=currentStatus === 'ACTIVE' || currentStatus === 'SCHEDULED' ? 'INACTIVE' : 'ACTIVE';
        try { await updatePromotionStatus(id,newStatus); showToast(`Promotion status updated to ${newStatus}`,"success"); fetchData(); } 
        catch (err) { showToast("Failed to update status.","error"); } finally { setActionLoading(null); }
    };

    const handleDeletePromo=async () => {
        if(!deletePromoId) return;
        setActionLoading(deletePromoId);
        try { await deletePromotion(deletePromoId); showToast("Promotion deleted.","success"); fetchData(); } 
        catch (err) { showToast("Failed to delete promotion.","error"); } 
        finally { setActionLoading(null); setDeletePromoId(null); }
    };

    // Tax Logic
    const handleCreateTax=async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try { await createTaxRule({ ...taxForm,ratePercentage: Number(taxForm.ratePercentage),endDate: taxForm.endDate || null }); showToast("Tax rule successfully deployed!","success"); setIsTaxModalOpen(false); setTaxForm(defaultTaxForm); fetchData(); } 
        catch (err: any) { showToast(err.response?.data || "Failed to create tax rule.","error"); } finally { setIsSubmitting(false); }
    };

    const handleDeleteTax=async () => {
        if(!deleteTaxId) return;
        setActionLoading(deleteTaxId);
        try { await deleteTaxRule(deleteTaxId); showToast("Tax rule deleted.","success"); fetchData(); } 
        catch (err) { showToast("Failed to delete tax rule.","error"); } 
        finally { setActionLoading(null); setDeleteTaxId(null); }
    };

    // Charge Logic
    const handleOpenCreateCharge=() => { setEditingChargeId(null); setChargeForm(defaultChargeForm); setIsChargeModalOpen(true); };
    const handleOpenEditCharge=(charge: any) => {
        setEditingChargeId(charge.id);
        setChargeForm({ name: charge.name,chargeType: charge.chargeType,amountOrPercentage: charge.amountOrPercentage,isActive: charge.isActive,minOrderAmount: charge.minOrderAmount,maxOrderAmount: charge.maxOrderAmount || '' });
        setIsChargeModalOpen(true);
    };

    const handleSaveCharge=async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const payload={ 
                ...chargeForm,
                amountOrPercentage: Number(chargeForm.amountOrPercentage),
                minOrderAmount: Number(chargeForm.minOrderAmount),
                maxOrderAmount: chargeForm.maxOrderAmount === '' ? null : Number(chargeForm.maxOrderAmount)
            };
            if(editingChargeId) await updateProductCharge(editingChargeId,payload);
            else await createProductCharge(payload);
            showToast(`Fee successfully ${editingChargeId ? 'updated' : 'created'}!`,"success"); setIsChargeModalOpen(false); setChargeForm(defaultChargeForm); setEditingChargeId(null); fetchData();
        } catch (err: any) { showToast(err.response?.data || "Failed to save fee.","error"); } 
        finally { setIsSubmitting(false); }
    };

    const handleDeleteCharge=async () => {
        if(!deleteChargeId) return;
        setActionLoading(deleteChargeId);
        try { await deleteProductCharge(deleteChargeId); showToast("Fee deleted.","success"); fetchData(); } 
        catch (err) { showToast("Failed to delete fee.","error"); } 
        finally { setActionLoading(null); setDeleteChargeId(null); }
    };

    // Rule Logic
    const handleOpenEditRule=(rule: any) => {
        setEditingRuleId(rule.id);
        setRuleForm({ tierName: rule.tierName,minimumPoints: rule.minimumPoints,maximumPoints: rule.maximumPoints || '',currencyAmountPerPoint: rule.currencyAmountPerPoint,maxRedeemablePointsPerOrder: rule.maxRedeemablePointsPerOrder,maxDiscountPercentage: rule.maxDiscountPercentage,pointExpiryDays: rule.pointExpiryDays,tierEvaluationPeriodDays: rule.tierEvaluationPeriodDays });
        setIsRuleModalOpen(true);
    };

   const handleSaveRule=async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
        const payload={ ...ruleForm,minimumPoints: Number(ruleForm.minimumPoints),maximumPoints: ruleForm.maximumPoints === '' ? null : Number(ruleForm.maximumPoints),currencyAmountPerPoint: Number(ruleForm.currencyAmountPerPoint),maxRedeemablePointsPerOrder: Number(ruleForm.maxRedeemablePointsPerOrder),maxDiscountPercentage: Number(ruleForm.maxDiscountPercentage),pointExpiryDays: Number(ruleForm.pointExpiryDays),tierEvaluationPeriodDays: Number(ruleForm.tierEvaluationPeriodDays) };
        
        // NEW LOGIC: Differentiate between Edit and Create
        if(editingRuleId) {
            await updateLoyaltyRule(editingRuleId,payload);
        } else {
            await createLoyaltyRule({ ...payload,tierName: ruleForm.tierName });
        }
        
        showToast(`Tier successfully ${editingRuleId ? 'updated' : 'created'}!`,"success"); 
        setIsRuleModalOpen(false); setEditingRuleId(null); fetchData();
    } catch (err: any) { 
        showToast(err.response?.data?.message || err.response?.data || "Failed to configure tier.","error"); 
    } 
    finally { setIsSubmitting(false); }
};

    const handleCheckboxArray=(formState: any,setFormState: any,field: string,id: number) => {
        setFormState((prev: any) => { const arr=prev[field]; if(arr.includes(id)) return { ...prev,[field]: arr.filter((x: number) => x !== id) }; return { ...prev,[field]: [...arr,id] }; });
    };

    const getPromoDisplayValue=(promo: any) => {
        switch (promo.type) {
            case 'PERCENTAGE_DISCOUNT': return `${promo.discountValue}% OFF`; case 'FIXED_AMOUNT_DISCOUNT': return `Rs. ${promo.discountValue} OFF`;
            case 'BUY_ONE_GET_ONE': return 'BUY 1 GET 1 FREE'; case 'BUY_X_GET_Y': return `BUY ${promo.buyQuantityX || 'X'} GET ${promo.getQuantityY || 'Y'} FREE`;
            case 'BRAND_DISCOUNT': return `${promo.discountValue}% OFF (Brand)`; case 'MINIMUM_SPEND_DISCOUNT': return `Rs. ${promo.discountValue} OFF (Min Spend)`;
            case 'TIERED_DISCOUNT': return `Tiered Discount`; case 'CATEGORY_DISCOUNT': return `${promo.discountValue}% OFF (Category)`; default: return `Special Offer`;
        }
    };

    // --- AI WORKFLOW TRIGGERS ---
    const handleTriggerFEFO=async () => {
        setIsTriggeringAI(true);
        try {
            const res=await triggerAIWorkflow();
            showToast(res.message,"success");
            setTimeout(() => fetchData(),5000); 
        } catch (err: any) { showToast("Failed to trigger FEFO Service.","error"); } 
        finally { setIsTriggeringAI(false); }
    };

    const handleTriggerCompliance=async () => {
        setIsTriggeringCompliance(true);
        try {
            const res=await triggerComplianceAIWorkflow();
            showToast(res.message,"success");
            setTimeout(() => fetchData(),5000); 
        } catch (err: any) { showToast("Failed to trigger Compliance Service.","error"); } 
        finally { setIsTriggeringCompliance(false); }
    };

    // --- TRANSACTIONAL AI EXECUTION ---
    const handleReviewAI=async (id: number,status: 'APPROVED' | 'REJECTED',payloadStr: string,workflowName: string) => {
        setActionLoading(id);
        try {
            if(status === 'APPROVED') {
                let payload;
                try {
                    payload=payloadStr ? JSON.parse(payloadStr) : null;
                    if(!payload) throw new Error("Empty payload");
                } catch (parseError) {
                    showToast("AI generated invalid JSON data. Rejecting workflow.","error");
                    await updateWorkflowStatus(id,'REJECTED'); 
                    fetchData(); setActionLoading(null); return;
                }

                // SECURE ROUTING LOGIC based on Workflow Name
                if(workflowName.includes("Audit") || workflowName.includes("tax") || workflowName.includes("compliances")) {
                    await executeBulkTaxMappings(payload);
                    showToast("Catalog Compliance Mappings Applied!","success");
                } 
                else if(workflowName.includes("FEFO") || workflowName.includes("protocol") || workflowName.includes("markdown")) {
                    const today=new Date();
                    const nextWeek=new Date();
                    nextWeek.setDate(today.getDate() + 7);
                    payload.startDate=today.toISOString().split('T')[0];
                    payload.endDate=nextWeek.toISOString().split('T')[0];

                    await createPromotion(payload);
                    showToast("AI Promotion Approved and Deployed!","success");
                }
                
                await updateWorkflowStatus(id,status);
            } else {
                await updateWorkflowStatus(id,status);
                showToast(`AI Workflow ${status.toLowerCase()}.`,"success");
            }
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.message || err.response?.data || "Failed to execute AI workflow.","error");
        } finally {
            setActionLoading(null);
        } 
    };

    return (
        <div className="min-h-screen bg-[#0B1F33] text-white p-8 relative">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0,y: -50 }} animate={{ opacity: 1,y: 0 }} exit={{ opacity: 0,y: -50 }} className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto">
                <div className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <button onClick={() => navigate('/catalog')} className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors mb-6 font-semibold"><ArrowLeft size={18} /> Go to Storefront Catalog</button>
                        <h1 className="font-display text-4xl font-bold tracking-wide flex items-center gap-3"><Megaphone className="text-[#D4AF37]" size={36} /> Promotions & Reports</h1>
                        <p className="text-gray-400 mt-2">Manage marketing campaigns,configure tax matrices,and analyze loyalty intelligence.</p>
                    </div>
                    {activeTab === 'PROMOTIONS' && <button onClick={handleOpenCreatePromo} className="bg-[#D4AF37] hover:bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-glow flex items-center gap-2"><Plus size={20} /> New Promotion</button>}
                    {activeTab === 'TAXES' && <button onClick={() => setIsTaxModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"><Plus size={20} /> New Tax Rule</button>}
                    {activeTab === 'CHARGES' && <button onClick={handleOpenCreateCharge} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"><Plus size={20} /> New Fee</button>}
                    {activeTab === 'RULES' && <button onClick={() => { setEditingRuleId(null); setRuleForm(defaultRuleForm); setIsRuleModalOpen(true); }} className="bg-[#D4AF37] hover:bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-glow flex items-center gap-2"><Plus size={20} /> New Tier</button>}
                </div>

                <div className="flex gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
                    <button onClick={() => setActiveTab('PROMOTIONS')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'PROMOTIONS' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}><Megaphone size={18} /> Active Promotions</button>
                    <button onClick={() => setActiveTab('TAXES')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'TAXES' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}><Percent size={18} /> Tax Engine</button>
                    <button onClick={() => setActiveTab('CHARGES')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'CHARGES' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}><Truck size={18} /> Delivery & Extra Fees</button>
                    <button onClick={() => setActiveTab('REPORTS')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'REPORTS' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}><BarChart3 size={18} /> Loyalty Intelligence</button>
                    <button onClick={() => setActiveTab('CUSTOMERS')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'CUSTOMERS' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}><Users size={18} /> Customer Directory</button>
                    <button onClick={() => setActiveTab('RULES')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'RULES' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}><Settings size={18} /> Loyalty Rules Engine</button>
                    <button onClick={() => setActiveTab('AI_AGENT')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'AI_AGENT' ? 'bg-purple-500/10 border border-purple-500 text-purple-400' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}> <Activity size={18} /> AI Assistants </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" /></div>
                ) : (
                    <>
                        {/* PROMOTIONS VIEW */}
                        {activeTab === 'PROMOTIONS' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {promotions.length === 0 ? (
                                    <div className="col-span-2 text-center py-20 bg-[#121212] rounded-3xl border border-dashed border-white/10"><Megaphone className="mx-auto text-gray-500 mb-4" size={48} /><h3 className="text-xl font-bold text-gray-400">No promotions running.</h3></div>
                                ) : (
                                    promotions.map(promo => (
                                        <motion.div initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }} key={promo.id} className={`bg-[#121212] border ${promo.status === 'ACTIVE' ? 'border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-white/5 opacity-70'} rounded-3xl p-6`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div><div className="text-xs font-bold text-[#D4AF37] mb-1 tracking-widest uppercase">{promo.type.replace(/_/g,' ')}</div><h3 className="text-xl font-bold text-white">{promo.name}</h3></div>
                                                <div className={`px-3 py-1 rounded-lg text-xs font-bold ${promo.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{promo.status}</div>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-6">{promo.description || 'No description provided.'}</p>
                                            <div className="flex items-center gap-4 mb-6 text-sm text-gray-400"><div className="flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5"><Calendar size={14}/> {new Date(promo.startDate).toLocaleDateString()}</div><span>to</span><div className="flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5"><Calendar size={14}/> {new Date(promo.endDate).toLocaleDateString()}</div></div>
                                            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                                <div className="text-xl font-display font-bold text-white">{getPromoDisplayValue(promo)}</div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleOpenEditPromo(promo)} disabled={actionLoading === promo.id} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors" title="Edit Promotion"><Edit2 size={18}/></button>
                                                    <button onClick={() => handleTogglePromoStatus(promo.id,promo.status)} disabled={actionLoading === promo.id} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors" title="Toggle Status">{actionLoading === promo.id ? <Loader2 size={18} className="animate-spin"/> : <Power size={18} className={promo.status === 'ACTIVE' ? 'text-green-400' : 'text-gray-400'}/>}</button>
                                                    <button onClick={() => setDeletePromoId(promo.id)} disabled={actionLoading === promo.id} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAXES VIEW */}
                        {activeTab === 'TAXES' && (
                            <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/5">
                                        <tr><th className="p-4">Tax Name</th><th className="p-4">Rate</th><th className="p-4">Start Date</th><th className="p-4">End Date</th><th className="p-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {taxes.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No custom tax rules configured.</td></tr>
                                        ) : (
                                            taxes.map(tax => (
                                                <tr key={tax.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-bold text-white">{tax.name}</td><td className="p-4 text-blue-400 font-bold">{tax.ratePercentage}%</td><td className="p-4 text-gray-400">{new Date(tax.startDate).toLocaleDateString()}</td><td className="p-4 text-gray-400">{tax.endDate ? new Date(tax.endDate).toLocaleDateString() : 'Ongoing'}</td>
                                                    <td className="p-4 text-right"><button onClick={() => setDeleteTaxId(tax.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16}/></button></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* CHARGES VIEW */}
                        {activeTab === 'CHARGES' && (
                            <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/5">
                                        <tr><th className="p-4">Fee Name</th><th className="p-4">Amount / Rate</th><th className="p-4">Order Range</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                    {charges.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">No extra delivery or product fees configured.</td></tr>
                                    ) : (
                                        charges.map(charge => (
                                            <tr key={charge.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold text-white">{charge.name}</td>
                                                <td className="p-4 text-green-400 font-bold">{charge.chargeType === 'FIXED' ? `Rs. ${charge.amountOrPercentage}` : `${charge.amountOrPercentage}%`}</td>
                                                <td className="p-4 text-gray-400 text-xs">Rs. {charge.minOrderAmount} - {charge.maxOrderAmount ? `Rs. ${charge.maxOrderAmount}` : 'Unlimited'}</td>
                                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${charge.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{charge.isActive ? 'Active' : 'Inactive'}</span></td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => handleOpenEditCharge(charge)} disabled={actionLoading === charge.id} className="p-2 text-gray-400 hover:text-white transition-colors mr-2"><Edit2 size={16}/></button>
                                                    <button onClick={() => setDeleteChargeId(charge.id)} disabled={actionLoading === charge.id} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                             </table>
                        </div>
                    )}

                        {/* REPORTS VIEW */}
                        {activeTab === 'REPORTS' && reportData && (
                            <motion.div initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-6"><div className="flex items-center gap-3 text-gray-400 mb-2"><Users size={18} className="text-blue-400" /> Total Customers</div><div className="text-3xl font-bold text-white">{reportData.customerMetrics.totalLoyaltyCustomers}</div></div>
                                    <div className="bg-gradient-to-br from-gray-700 to-black border border-gray-500/30 rounded-2xl p-6"><div className="text-gray-300 text-sm font-bold mb-2">Silver Tier</div><div className="text-3xl font-bold text-white">{reportData.customerMetrics.silverCustomers}</div></div>
                                    <div className="bg-gradient-to-br from-[#D4AF37] to-[#5c430a] border border-[#D4AF37]/50 rounded-2xl p-6"><div className="text-white/80 text-sm font-bold mb-2">Gold Tier</div><div className="text-3xl font-bold text-white">{reportData.customerMetrics.goldCustomers}</div></div>
                                    <div className="bg-gradient-to-br from-gray-300 to-gray-600 border border-gray-300/50 rounded-2xl p-6"><div className="text-black/80 text-sm font-bold mb-2">Platinum Tier</div><div className="text-3xl font-bold text-black">{reportData.customerMetrics.platinumCustomers}</div></div>
                                </div>
                                <h3 className="text-xl font-bold text-white pt-4 border-t border-white/10 flex items-center gap-2"><Activity size={20} className="text-[#D4AF37]"/> Financial Impact & Points Flow</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-6"><div className="flex items-center gap-3 text-gray-400 mb-2"><Star size={18} className="text-green-400" /> Points Earned (Issued)</div><div className="text-3xl font-bold text-white">{reportData.pointMetrics.totalPointsEarned.toLocaleString()}</div></div>
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-6"><div className="flex items-center gap-3 text-gray-400 mb-2"><Star size={18} className="text-orange-400" /> Points Redeemed (Spent)</div><div className="text-3xl font-bold text-white">{reportData.pointMetrics.totalPointsRedeemed.toLocaleString()}</div></div>
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-6"><div className="flex items-center gap-3 text-gray-400 mb-2"><Star size={18} className="text-red-400" /> Points Expired (Lost)</div><div className="text-3xl font-bold text-white">{reportData.pointMetrics.totalPointsExpired.toLocaleString()}</div></div>
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-6"><div className="flex items-center gap-3 text-gray-400 mb-2"><DollarSign size={18} className="text-[#D4AF37]" /> Sales Involving Loyalty</div><div className="text-3xl font-bold text-white">Rs. {reportData.salesMetrics.salesFromLoyaltyOrders.toLocaleString(undefined,{minimumFractionDigits: 2})}</div></div>
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-6"><div className="flex items-center gap-3 text-gray-400 mb-2"><Percent size={18} className="text-[#D4AF37]" /> Total Discount Liability</div><div className="text-3xl font-bold text-white">Rs. {reportData.salesMetrics.totalLoyaltyRedemptionValue.toLocaleString(undefined,{minimumFractionDigits: 2})}</div></div>
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-6"><div className="flex items-center gap-3 text-gray-400 mb-2"><Megaphone size={18} className="text-blue-400" /> Orders Utilizing Points</div><div className="text-3xl font-bold text-white">{reportData.salesMetrics.ordersPaidUsingPoints}</div></div>
                                </div>
                            </motion.div>
                        )}

                        {/* CUSTOMERS VIEW */}
                        {activeTab === 'CUSTOMERS' && (
                            <motion.div initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }} className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/30">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 font-bold">Select Tier:</span>
                                        <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white font-bold outline-none cursor-pointer">
                                            <option value="Silver">Silver Tier</option><option value="Gold">Gold Tier</option><option value="Platinum">Platinum Tier</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/5">
                                            <tr><th className="p-4">Loyalty ID</th><th className="p-4">Customer Name</th><th className="p-4 text-center">Current Points</th><th className="p-4 text-center">Lifetime Earned</th><th className="p-4 text-right">Actions</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {customers.length === 0 && !loadingCustomers ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No customers found in this tier.</td></tr>
                                            ) : (
                                                customers.map(c => (
                                                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 font-mono text-xs text-[#D4AF37] tracking-widest">{c.loyaltyIdNumber}</td>
                                                        <td className="p-4 font-bold text-white">{c.customerName}<div className="text-xs text-gray-500 font-normal">{c.email}</div></td>
                                                        <td className="p-4 text-center text-white font-bold">{c.currentPointsBalance.toLocaleString()}</td>
                                                        <td className="p-4 text-center text-gray-400">{c.totalPointsEarned.toLocaleString()}</td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => { setGiftCustomerId(c.id); setIsGiftModalOpen(true); }} className="px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ml-auto">
                                                                <Gift size={14} /> Gift Promo
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {hasMoreCustomers && (
                                    <div className="p-6 border-t border-white/5 flex justify-center bg-black/20">
                                        <button onClick={loadMoreCustomers} disabled={loadingCustomers} className="px-6 py-2 border border-white/10 hover:border-[#D4AF37] hover:text-[#D4AF37] text-gray-400 font-bold rounded-xl transition-all flex items-center gap-2">
                                            {loadingCustomers ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />} See More Customers
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* RULES VIEW */}
                        {activeTab === 'RULES' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {loyaltyRules.map(rule => (
                                    <motion.div initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }} key={rule.id} className={`bg-[#121212] border rounded-3xl p-6 ${rule.tierName === 'Gold' ? 'border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : (rule.tierName === 'Platinum' ? 'border-gray-400/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-white/5')}`}>
                                        <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                                            <h3 className="text-2xl font-bold text-white">{rule.tierName}</h3>
                                            <button onClick={() => handleOpenEditRule(rule)} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"><Edit2 size={16}/></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Point Range Requirement</div>
                                                <div className="font-bold text-lg text-white">{rule.minimumPoints.toLocaleString()} {rule.maximumPoints ? `- ${rule.maximumPoints.toLocaleString()}` : '+'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Exchange Rate</div>
                                                <div className="font-bold text-lg text-[#D4AF37]">Rs. {rule.currencyAmountPerPoint.toFixed(2)}=1 Point</div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                                <div><div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Max Redemption</div><div className="font-bold text-white">{rule.maxRedeemablePointsPerOrder.toLocaleString()} pts</div></div>
                                                <div><div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Max Discount Ceiling</div><div className="font-bold text-blue-400">{rule.maxDiscountPercentage}% of subtotal</div></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                                <div><div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Point Expiry</div><div className="font-bold text-gray-300">{rule.pointExpiryDays} Days</div></div>
                                                <div><div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tier Review Period</div><div className="font-bold text-gray-300">{rule.tierEvaluationPeriodDays} Days</div></div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* ============================================================== */}
                        {/* AI AGENT VIEW: FEFO & FINANCE COMPLIANCE                       */}
                        {/* ============================================================== */}
                        {activeTab === 'AI_AGENT' && (
                            <div className="space-y-6">
                                {/* Workflow 1: FEFO Optimizer */}
                                <div className="flex justify-between items-center bg-[#121212] border border-[#D4AF37]/30 p-6 rounded-3xl shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3"><Activity className="text-[#D4AF37]"/> Autonomous FEFO Optimizer</h3>
                                        <p className="text-gray-400 text-sm mt-1">Triggers LangGraph to scan for expiring batches and draft optimal discount strategies.</p>
                                    </div>
                                    <button onClick={handleTriggerFEFO} disabled={isTriggeringAI} className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition-all flex items-center gap-2 disabled:opacity-50">
                                        {isTriggeringAI ? <Loader2 size={20} className="animate-spin" /> : <Activity size={20} />} Run Inventory Analysis
                                    </button>
                                </div>

                                {/* Workflow 4: Tax Compliance Auditor */}
                                <div className="flex justify-between items-center bg-[#121212] border border-purple-500/30 p-6 rounded-3xl shadow-[0_0_20px_rgba(168,85,247,0.1)] mt-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3"><ShieldCheck className="text-purple-400"/> Catalog Tax Compliance Auditor</h3>
                                        <p className="text-gray-400 text-sm mt-1">Sweeps database for unmapped products and uses semantic AI to enforce legal tax rules.</p>
                                    </div>
                                    <button onClick={handleTriggerCompliance} disabled={isTriggeringCompliance} className="bg-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg">
                                        {isTriggeringCompliance ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />} Audit Catalog
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-white mt-8 mb-4">Pending Human Approvals</h3>
                                {aiWorkflows.length === 0 ? (
                                    <div className="text-center py-12 bg-[#121212] rounded-3xl border border-dashed border-white/10">
                                        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
                                        <h3 className="text-xl font-bold text-gray-400">All caught up! No pending AI workflows.</h3>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {aiWorkflows.map(workflow => {
                                            const isCompliance=workflow.workflowName.includes('Audit') || workflow.workflowName.includes('tax');
                                            
                                            return (
                                                <motion.div initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }} key={workflow.id} className={`bg-[#121212] border rounded-3xl p-6 ${isCompliance ? 'border-purple-500/30' : 'border-blue-500/30'}`}>
                                                    <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-4">
                                                        <div>
                                                            {/* POLISH: Visually distinguishes Finance AI tasks vs Marketing AI tasks! */}
                                                            <div className={`text-xs font-bold mb-1 tracking-widest uppercase flex items-center gap-2 ${isCompliance ? 'text-purple-400' : 'text-blue-400'}`}>
                                                                {isCompliance ? <ShieldCheck size={14}/> : <Megaphone size={14}/>}
                                                                ID: {workflow.id} • {new Date(workflow.createdAt).toLocaleString()} • {isCompliance ? 'FINANCE AI' : 'MARKETING AI'}
                                                            </div>
                                                            <h3 className="text-xl font-bold text-white">{workflow.workflowName}</h3>
                                                        </div>
                                                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 font-bold text-xs rounded-lg animate-pulse">AWAITING REVIEW</span>
                                                    </div>
                                                    
                                                    <div className="mb-6">
                                                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">{isCompliance ? 'Semantic Analysis & Financial Impact' : 'Agent Analysis Summary'}</h4>
                                                        <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                            {workflow.executionSummary}
                                                        </div>
                                                    </div>

                                                    <div className="mb-6">
                                                        <h4 className={`text-sm font-bold uppercase mb-2 ${isCompliance ? 'text-purple-400' : 'text-[#D4AF37]'}`}>{isCompliance ? 'Proposed DB Mapping Payload' : 'Proposed Promotion Payload'}</h4>
                                                        <div className={`bg-black/80 p-4 rounded-xl border font-mono text-xs text-green-400 whitespace-pre-wrap overflow-x-auto ${isCompliance ? 'border-purple-500/30' : 'border-[#D4AF37]/30'}`}>
                                                            {workflow.proposedPayload ? JSON.stringify(JSON.parse(workflow.proposedPayload),null,2) : "No payload generated."}
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                                        <button 
                                                            onClick={() => handleReviewAI(workflow.id,'REJECTED',workflow.proposedPayload,workflow.workflowName)} 
                                                            disabled={actionLoading === workflow.id}
                                                            className="px-6 py-2 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                                                        >
                                                            Reject Action
                                                        </button>
                                                        <button 
                                                            onClick={() => handleReviewAI(workflow.id,'APPROVED',workflow.proposedPayload,workflow.workflowName)} 
                                                            disabled={actionLoading === workflow.id}
                                                            className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-lg flex items-center gap-2"
                                                        >
                                                            {actionLoading === workflow.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {isCompliance ? 'Approve Mappings' : 'Approve & Deploy'}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div> 
                        )}
                    </>
                )}
            </div>

            {/* MODALS OMITTED FOR BREVITY (They remain exactly the same as above) */}
            <AnimatePresence>
                {/* Promo Modal */}
                {isPromoModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setIsPromoModalOpen(false)}></motion.div>
                        <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-4xl w-full z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-3"><Megaphone className="text-[#D4AF37]"/> {editingPromoId ? 'Edit Promotion Strategy' : 'New Promotion Strategy'}</h2>
                                <button onClick={() => setIsPromoModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                            </div>
                            
                            <form onSubmit={handleSavePromo} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Promotion Name *</label>
                                            <input required type="text" value={promoForm.name} onChange={e => setPromoForm({...promoForm,name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Description</label>
                                            <textarea rows={2} value={promoForm.description} onChange={e => setPromoForm({...promoForm,description: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none"></textarea>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Start Date *</label><input required type="date" min={todayString} value={promoForm.startDate} onChange={e => setPromoForm({...promoForm,startDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                            <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">End Date *</label><input required type="date" min={promoForm.startDate} value={promoForm.endDate} onChange={e => setPromoForm({...promoForm,endDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                        </div>

                                        <div className="bg-black/30 p-4 border border-white/5 rounded-xl space-y-4">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-2"><Tag size={14}/> Promotion Type *</label>
                                                <select value={promoForm.type} onChange={e => setPromoForm({...promoForm,type: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none appearance-none cursor-pointer">
                                                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount (%)</option><option value="FIXED_AMOUNT_DISCOUNT">Fixed Amount Discount (Rs.)</option>
                                                    <option value="BUY_ONE_GET_ONE">Buy One Get One (BOGO)</option><option value="BUY_X_GET_Y">Buy X Get Y</option>
                                                    <option value="BRAND_DISCOUNT">Brand Discount</option><option value="CATEGORY_DISCOUNT">Category Discount</option>
                                                    <option value="MINIMUM_SPEND_DISCOUNT">Minimum Spend Discount</option>
                                                </select>
                                            </div>

                                            <AnimatePresence mode="popLayout">
                                                {['PERCENTAGE_DISCOUNT','FIXED_AMOUNT_DISCOUNT','BRAND_DISCOUNT','CATEGORY_DISCOUNT','MINIMUM_SPEND_DISCOUNT'].includes(promoForm.type) && (
                                                    <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }}>
                                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Discount Value {promoForm.type === 'PERCENTAGE_DISCOUNT' ? '(%)' : '(Rs.)'} *</label>
                                                        <input required type="number" min="0.01" step="0.01" value={promoForm.discountValue} onChange={e => setPromoForm({...promoForm,discountValue: e.target.value})} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" />
                                                    </motion.div>
                                                )}
                                                {promoForm.type === 'BRAND_DISCOUNT' && (
                                                    <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }}>
                                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block mt-4">Target Brand Name *</label>
                                                        <input required type="text" value={promoForm.targetBrand} onChange={e => setPromoForm({...promoForm,targetBrand: e.target.value})} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" />
                                                    </motion.div>
                                                )}
                                                {promoForm.type === 'MINIMUM_SPEND_DISCOUNT' && (
                                                    <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }}>
                                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block mt-4">Minimum Spend (Rs.) *</label>
                                                        <input required type="number" min="1" step="0.01" value={promoForm.minimumSpend} onChange={e => setPromoForm({...promoForm,minimumSpend: e.target.value})} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" />
                                                    </motion.div>
                                                )}
                                                {promoForm.type === 'BUY_X_GET_Y' && (
                                                    <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="grid grid-cols-2 gap-4">
                                                        <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Buy Qty (X) *</label><input required type="number" min="1" value={promoForm.buyQuantityX} onChange={e => setPromoForm({...promoForm,buyQuantityX: e.target.value})} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                                        <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Get Qty (Y) *</label><input required type="number" min="1" value={promoForm.getQuantityY} onChange={e => setPromoForm({...promoForm,getQuantityY: e.target.value})} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* TARGETING ENGINE UI */}
                                    <div className="space-y-4">
                                        <div className="bg-black/30 p-4 border border-white/5 rounded-xl">
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Target Categories (Leave empty for store-wide)</label>
                                            <div className="max-h-32 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg p-2 space-y-2 bg-[#121212]">
                                                {targetCategories.map(c => (
                                                    <label key={c.id} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 hover:text-white">
                                                        <input type="checkbox" checked={promoForm.categoryIds.includes(c.id)} onChange={() => handleCheckboxArray(promoForm,setPromoForm,'categoryIds',c.id)} className="w-4 h-4 accent-[#D4AF37]" /> {c.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-black/30 p-4 border border-white/5 rounded-xl">
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Target Products (Overrides Categories)</label>
                                            <div className="max-h-32 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg p-2 space-y-2 bg-[#121212]">
                                                {targetProducts.map(p => (
                                                    <label key={p.id} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 hover:text-white truncate">
                                                        <input type="checkbox" checked={promoForm.productIds.includes(p.id)} onChange={() => handleCheckboxArray(promoForm,setPromoForm,'productIds',p.id)} className="w-4 h-4 accent-[#D4AF37] shrink-0" /> {p.name} <span className="text-xs text-gray-500">({p.brand})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-black/30 p-4 border border-white/5 rounded-xl">
                                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                                <input type="checkbox" checked={promoForm.isLoyaltyPromotion} onChange={e => setPromoForm({...promoForm,isLoyaltyPromotion: e.target.checked})} className="w-5 h-5 accent-[#D4AF37]"/>
                                                <span className="text-sm font-bold text-[#D4AF37]">VelocityFamily Member Exclusive</span>
                                            </label>
                                            
                                            {promoForm.isLoyaltyPromotion && (
                                                <motion.div initial={{ opacity: 0,height: 0 }} animate={{ opacity: 1,height: 'auto' }} className="mt-2 pl-8 border-l border-[#D4AF37]/30 space-y-2">
                                                    <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Select Applicable Tiers</label>
                                                    {targetTiers.length === 0 ? (
                                                        <div className="text-xs text-gray-500 italic">Loading tiers...</div>
                                                    ) : (
                                                        targetTiers.map(t => (
                                                            <label key={t.id} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 hover:text-white">
                                                                <input type="checkbox" checked={promoForm.loyaltyRuleIds.includes(t.id)} onChange={() => handleCheckboxArray(promoForm,setPromoForm,'loyaltyRuleIds',t.id)} className="w-4 h-4 accent-[#D4AF37]" /> {t.tierName} Tier
                                                            </label>
                                                        ))
                                                    )}
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                                    <button type="button" onClick={() => setIsPromoModalOpen(false)} className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2 shadow-glow disabled:opacity-50">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>} {editingPromoId ? 'Update Strategy' : 'Deploy Strategy'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Tax Modal */}
                {isTaxModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setIsTaxModalOpen(false)}></motion.div>
                        <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-4xl w-full z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-3"><Percent className="text-blue-400"/> New Tax Rule</h2>
                                <button onClick={() => setIsTaxModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleCreateTax} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Tax Matrix Name *</label>
                                            <input required type="text" value={taxForm.name} onChange={e => setTaxForm({...taxForm,name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" placeholder="e.g. Standard VAT" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Rate Percentage (%) *</label>
                                            <input required type="number" min="0" step="0.01" value={taxForm.ratePercentage} onChange={e => setTaxForm({...taxForm,ratePercentage: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Start Date *</label>
                                                <input required type="date" min={todayString} value={taxForm.startDate} onChange={e => setTaxForm({...taxForm,startDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">End Date (Optional)</label>
                                                <input type="date" min={taxForm.startDate} value={taxForm.endDate} onChange={e => setTaxForm({...taxForm,endDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-black/30 p-4 border border-white/5 rounded-xl">
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Target Categories (Leave empty for store-wide)</label>
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg p-2 space-y-2 bg-[#121212]">
                                                {targetCategories.map(c => (
                                                    <label key={c.id} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 hover:text-white">
                                                        <input type="checkbox" checked={taxForm.categoryIds.includes(c.id)} onChange={() => handleCheckboxArray(taxForm,setTaxForm,'categoryIds',c.id)} className="w-4 h-4 accent-blue-500" /> {c.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-black/30 p-4 border border-white/5 rounded-xl">
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Target Products (Overrides Categories)</label>
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg p-2 space-y-2 bg-[#121212]">
                                                {targetProducts.map(p => (
                                                    <label key={p.id} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 hover:text-white truncate">
                                                        <input type="checkbox" checked={taxForm.productIds.includes(p.id)} onChange={() => handleCheckboxArray(taxForm,setTaxForm,'productIds',p.id)} className="w-4 h-4 accent-blue-500 shrink-0" /> {p.name} <span className="text-xs text-gray-500">({p.brand})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                                    <button type="button" onClick={() => setIsTaxModalOpen(false)} className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>} Save Tax Matrix
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Charge Modal */}
                {isChargeModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setIsChargeModalOpen(false)}></motion.div>
                        <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-2xl w-full z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-3"><Truck className="text-green-400"/> {editingChargeId ? 'Edit Fee' : 'New Delivery / Extra Fee'}</h2>
                                <button onClick={() => setIsChargeModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveCharge} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Fee Name *</label>
                                        <input required type="text" value={chargeForm.name} onChange={e => setChargeForm({...chargeForm,name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-green-400 outline-none" placeholder="e.g. Standard Delivery" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Fee Type *</label>
                                            <select value={chargeForm.chargeType} onChange={e => setChargeForm({...chargeForm,chargeType: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-green-400 outline-none appearance-none cursor-pointer">
                                                <option value="FIXED">Fixed Amount (Rs.)</option>
                                                <option value="PERCENTAGE">Percentage (%)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Amount / Rate *</label>
                                            <input required type="number" min="0" step="0.01" value={chargeForm.amountOrPercentage} onChange={e => setChargeForm({...chargeForm,amountOrPercentage: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-green-400 outline-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                       <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Min Order Total (Rs.) *</label>
                                            <input required type="number" min="0" value={chargeForm.minOrderAmount} onChange={e => setChargeForm({...chargeForm,minOrderAmount: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-green-400 outline-none" placeholder="0" />
                                        </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Max Order Total (Rs.)</label>
                                        <input type="number" min={chargeForm.minOrderAmount} value={chargeForm.maxOrderAmount} onChange={e => setChargeForm({...chargeForm,maxOrderAmount: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-green-400 outline-none" placeholder="Leave empty for unlimited" />
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer mt-4 bg-black/30 p-4 border border-white/5 rounded-xl transition-colors hover:border-green-500/50">
                                    <input type="checkbox" checked={chargeForm.isActive} onChange={e => setChargeForm({...chargeForm,isActive: e.target.checked})} className="w-5 h-5 accent-green-500"/>
                                    <span className="text-sm font-bold text-white">Fee is currently Active</span>
                                </label>
                            </div>
                    
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setIsChargeModalOpen(false)} className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>} Save Fee
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
                )}

                {/* Rule Modal */}
                {isRuleModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setIsRuleModalOpen(false)}></motion.div>
                        <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="bg-[#121212] border border-[#D4AF37]/30 rounded-3xl p-8 max-w-lg w-full z-10 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-3"><Settings className="text-[#D4AF37]"/> Configure {ruleForm.tierName} Tier</h2>
                                <button onClick={() => setIsRuleModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveRule} className="space-y-4">
                                {!editingRuleId && (
                                    <div className="mb-4">
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Tier Name *</label>
                                        <input required type="text" value={ruleForm.tierName} onChange={e => setRuleForm({...ruleForm,tierName: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" placeholder="e.g. Gold" />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Min Points *</label><input required type="number" min="0" value={ruleForm.minimumPoints} onChange={e => setRuleForm({...ruleForm,minimumPoints: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                    <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Max Points (Optional)</label><input type="number" min="1" value={ruleForm.maximumPoints} onChange={e => setRuleForm({...ruleForm,maximumPoints: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" placeholder="No Limit" /></div>
                                </div>
                                <div className="p-4 bg-black/30 border border-white/5 rounded-xl">
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Points Exchange Rate (Rs) *</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 font-bold">Rs.</span>
                                        <input required type="number" min="1" step="0.01" value={ruleForm.currencyAmountPerPoint} onChange={e => setRuleForm({...ruleForm,currencyAmountPerPoint: e.target.value})} className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" />
                                        <span className="text-gray-400 font-bold">= 1 Point</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Max Redemption/Order *</label><input required type="number" min="1" value={ruleForm.maxRedeemablePointsPerOrder} onChange={e => setRuleForm({...ruleForm,maxRedeemablePointsPerOrder: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                    <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Max Discount Ceiling (%) *</label><input required type="number" min="1" max="100" step="0.1" value={ruleForm.maxDiscountPercentage} onChange={e => setRuleForm({...ruleForm,maxDiscountPercentage: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Point Expiry (Days) *</label><input required type="number" min="1" value={ruleForm.pointExpiryDays} onChange={e => setRuleForm({...ruleForm,pointExpiryDays: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                    <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Tier Review (Days) *</label><input required type="number" min="1" value={ruleForm.tierEvaluationPeriodDays} onChange={e => setRuleForm({...ruleForm,tierEvaluationPeriodDays: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" /></div>
                                </div>
                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                                    <button type="button" onClick={() => setIsRuleModalOpen(false)} className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2 shadow-glow disabled:opacity-50">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>} Save Rules
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Gift Modal */}
                {isGiftModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setIsGiftModalOpen(false)}></motion.div>
                        <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="bg-[#121212] border border-[#D4AF37]/30 rounded-3xl p-8 max-w-sm w-full z-10 text-center relative shadow-[0_0_50px_rgba(212,175,55,0.15)]">
                            <button onClick={() => setIsGiftModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                            <div className="mx-auto w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-full flex items-center justify-center mb-6"><Gift size={32} /></div>
                            <h3 className="text-xl font-bold text-white mb-2">Gift Promotion</h3>
                            <p className="text-gray-400 text-sm mb-6">Assign a special promotion directly to this customer's account.</p>
                            <select value={selectedGiftPromoId} onChange={e => setSelectedGiftPromoId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none appearance-none cursor-pointer mb-6 text-sm text-left">
                                <option value="">-- Select Active Promotion --</option>
                                {promotions.filter(p => p.status === 'ACTIVE').map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({getPromoDisplayValue(p)})</option>
                                ))}
                            </select>
                            <button onClick={handleGiftPromo} disabled={isSubmitting || !selectedGiftPromoId} className="w-full px-4 py-3 rounded-xl font-bold bg-[#D4AF37] text-black shadow-glow hover:bg-yellow-500 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Gift'}
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* ========================================== */}
                {/* DELETE PROMO MODAL                         */}
                {/* ========================================== */}
                {deletePromoId && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeletePromoId(null)} />
                        <motion.div initial={{ opacity: 0,scale: 0.95,y: 20 }} animate={{ opacity: 1,scale: 1,y: 0 }} exit={{ opacity: 0,scale: 0.95,y: 20 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                            <button onClick={() => setDeletePromoId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                            <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mb-6"><AlertCircle size={32} /></div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Promotion?</h3>
                            <p className="text-gray-400 text-sm mb-8">Are you sure you want to permanently delete this promotion?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeletePromoId(null)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button onClick={handleDeletePromo} className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors">Yes,Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ========================================== */}
                {/* DELETE TAX MODAL                           */}
                {/* ========================================== */}
                {deleteTaxId && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteTaxId(null)} />
                        <motion.div initial={{ opacity: 0,scale: 0.95,y: 20 }} animate={{ opacity: 1,scale: 1,y: 0 }} exit={{ opacity: 0,scale: 0.95,y: 20 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                            <button onClick={() => setDeleteTaxId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                            <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mb-6"><AlertCircle size={32} /></div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Tax Rule?</h3>
                            <p className="text-gray-400 text-sm mb-8">Are you sure you want to permanently delete this tax rule?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteTaxId(null)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button onClick={handleDeleteTax} className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors">Yes,Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ========================================== */}
                {/* DELETE CHARGE MODAL                        */}
                {/* ========================================== */}
                {deleteChargeId && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteChargeId(null)} />
                        <motion.div initial={{ opacity: 0,scale: 0.95,y: 20 }} animate={{ opacity: 1,scale: 1,y: 0 }} exit={{ opacity: 0,scale: 0.95,y: 20 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                            <button onClick={() => setDeleteChargeId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                            <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mb-6"><AlertCircle size={32} /></div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Fee?</h3>
                            <p className="text-gray-400 text-sm mb-8">Are you sure you want to permanently delete this extra fee?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteChargeId(null)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button onClick={handleDeleteCharge} className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors">Yes,Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}