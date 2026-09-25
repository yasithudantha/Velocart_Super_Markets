import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Plus, Check, AlertTriangle, FileText, X, Calendar, PackageOpen, Loader2, Trash2, Edit2, Bot, Activity, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { getPendingERPWorkflows, triggerERPAIWorkflow, updateWorkflowStatus, createPurchaseOrder } from '../api/inventoryApi';

const API_URL = 'http://localhost:5176/api';
const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

interface PurchaseOrderItem { id: number; productVariantId: number; orderedQuantity: number; receivedQuantity: number; purchasePrice: number; productVariant?: { sku: string; weightOrSize: string; product?: { name: string; brand: string } }; }
interface PurchaseOrder { id: number; supplierId: number; supplier?: { name: string; contactEmail: string }; orderDate: string; expectedDeliveryDate: string; status: number; totalAmount: number; items: PurchaseOrderItem[]; }

export default function PurchaseOrderManager() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalError, setModalError] = useState('');
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'AI_AGENT'>('ACTIVE');

    // Current Date string strictly for input validation (prevents past dates)
    const todayString = new Date().toISOString().split('T')[0];

    // Receiving Modal
    const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
    const [receiveForm, setReceiveForm] = useState<any[]>([]);
    const [receiveNotes, setReceiveNotes] = useState('');
    
    // Creation/Edit Modal
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingPO, setIsCreatingPO] = useState(false);
    const [editingPOId, setEditingPOId] = useState<number | null>(null); // NEW: Track if editing
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [newPOForm, setNewPOForm] = useState({ supplierId: '', expectedDeliveryDate: '', items: [{ productVariantId: '', orderedQuantity: 1, purchasePrice: 0 }] });
    const [isCreatingNewSupplier, setIsCreatingNewSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');

    // AI Workflows
    const [aiWorkflows, setAiWorkflows] = useState<any[]>([]);
    const [isTriggeringAI, setIsTriggeringAI] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 4000); };

    useEffect(() => { 
        if (activeTab === 'AI_AGENT') fetchAIWorkflows();
        else fetchOrders(); 
    }, [activeTab]);

    const fetchOrders = async () => {
        setIsLoading(true); setError('');
        try {
            const response = await axios.get(`${API_URL}/inventory/purchase-orders`, getAuthHeader());
            setOrders(response.data);
        } catch (err: any) { setError(err.response?.data?.message || "Failed to load Purchase Orders."); } 
        finally { setIsLoading(false); }
    };

    // --- AI WORKFLOW LOGIC ---
    const fetchAIWorkflows = async () => {
        setIsLoading(true);
        try {
            const res = await getPendingERPWorkflows();
            // Filter so PM ONLY sees ERP tasks, not FEFO or Customer Ops
            const erpTasks = res.filter((w: any) => w.workflowName.includes('Forecast'));
            setAiWorkflows(erpTasks);
        } catch (err) { showToast("Failed to fetch pending AI tasks.", "error"); }
        finally { setIsLoading(false); }
    };

    const handleTriggerAI = async () => {
        setIsTriggeringAI(true);
        try {
            const res = await triggerERPAIWorkflow();
            showToast(res.message, "success");
            setTimeout(() => fetchAIWorkflows(), 5000); 
        } catch (err: any) {
            showToast("Failed to trigger ERP AI Service.", "error");
        } finally {
            setIsTriggeringAI(false);
        }
    };

    const handleReviewAI = async (id: number, status: 'APPROVED' | 'REJECTED', payloadStr: string) => {
        setActionLoading(id);
        try {
            if (status === 'APPROVED') {
                let payload;
                try {
                    payload = payloadStr ? JSON.parse(payloadStr) : null;
                    if (!payload) throw new Error("Empty payload");
                } catch (parseError) {
                    showToast("AI generated invalid data. Rejecting workflow.", "error");
                    await updateWorkflowStatus(id, 'REJECTED'); 
                    fetchAIWorkflows();
                    setActionLoading(null);
                    return;
                }

                // Execute the standard PO Creation endpoint with the AI's payload
                await createPurchaseOrder(payload);
                await updateWorkflowStatus(id, status);
                showToast("AI Purchase Order Approved and Sent!", "success");
            } else {
                await updateWorkflowStatus(id, status);
                showToast("AI Purchase Order Rejected.", "success");
            }
            
            fetchAIWorkflows();
            fetchOrders(); 
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to execute AI workflow.", "error");
        } finally {
            setActionLoading(null);
        }
    };

    // --- CREATE / EDIT PO LOGIC ---
    const openCreateModal = async () => {
        setIsCreatingPO(true); setEditingPOId(null); setModalError(''); setIsCreatingNewSupplier(false); setNewSupplierName('');
        try {
            const [suppRes, varRes] = await Promise.all([ axios.get(`${API_URL}/inventory/suppliers`, getAuthHeader()), axios.get(`${API_URL}/inventory/variants`, getAuthHeader()) ]);
            setSuppliers(suppRes.data); setVariants(varRes.data);
            
            // Set Default delivery date to 7 days from strictly today
            const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
            setNewPOForm({ supplierId: '', expectedDeliveryDate: nextWeek.toISOString().split('T')[0], items: [{ productVariantId: '', orderedQuantity: 1, purchasePrice: 0 }] });
        } catch (err: any) { setModalError("Failed to load dropdown data."); }
    };

    const openEditModal = async (po: PurchaseOrder) => {
        setIsCreatingPO(true); setEditingPOId(po.id); setModalError(''); setIsCreatingNewSupplier(false); setNewSupplierName('');
        try {
            const [suppRes, varRes] = await Promise.all([ axios.get(`${API_URL}/inventory/suppliers`, getAuthHeader()), axios.get(`${API_URL}/inventory/variants`, getAuthHeader()) ]);
            setSuppliers(suppRes.data); setVariants(varRes.data);
            
            setNewPOForm({ 
                supplierId: po.supplierId.toString(), 
                expectedDeliveryDate: po.expectedDeliveryDate.split('T')[0], 
                items: po.items.map(i => ({ productVariantId: i.productVariantId.toString(), orderedQuantity: i.orderedQuantity, purchasePrice: i.purchasePrice })) 
            });
        } catch (err: any) { setModalError("Failed to load PO data."); }
    };

    const submitNewPO = async () => {
        setModalError('');
        let finalSupplierId = newPOForm.supplierId;

        if (isCreatingNewSupplier) {
            if (!newSupplierName.trim()) return setModalError("Please enter a name for the new supplier.");
            try {
                const res = await axios.post(`${API_URL}/inventory/suppliers`, { name: newSupplierName }, getAuthHeader());
                finalSupplierId = res.data.id;
                setSuppliers([...suppliers, res.data]);
            } catch (err: any) { return setModalError(err.response?.data?.message || "Failed to create new supplier."); }
        } else if (!finalSupplierId) return setModalError("Please select a supplier or create a new one.");

        if (newPOForm.items.some(i => !i.productVariantId || i.orderedQuantity <= 0 || i.purchasePrice < 0)) return setModalError("Please ensure all products are selected with valid quantities and prices.");
        
        setIsSubmitting(true);
        try {
            const payload = {
                supplierId: Number(finalSupplierId),
                expectedDeliveryDate: newPOForm.expectedDeliveryDate,
                items: newPOForm.items.map(i => ({ productVariantId: Number(i.productVariantId), orderedQuantity: Number(i.orderedQuantity), purchasePrice: Number(i.purchasePrice) }))
            };

            // Differentiate between POST (Create) and PUT (Edit)
            if (editingPOId) await axios.put(`${API_URL}/inventory/purchase-orders/${editingPOId}`, payload, getAuthHeader());
            else await axios.post(`${API_URL}/inventory/purchase-orders`, payload, getAuthHeader());
            
            setIsCreatingPO(false); fetchOrders();
            showToast("Purchase order saved successfully.", "success");
        } catch (err: any) { setModalError(err.response?.data?.message || "Failed to save Purchase Order."); } 
        finally { setIsSubmitting(false); }
    };

    // --- DELETE PO HISTORY LOGIC ---
    const deleteHistoricalPO = async (id: number) => {
        if (!window.confirm("Are you sure you want to permanently delete this historical record?")) return;
        try {
            await axios.delete(`${API_URL}/inventory/purchase-orders/${id}`, getAuthHeader());
            fetchOrders();
            showToast("Record deleted.", "success");
        } catch (err: any) { showToast(err.response?.data?.message || "Failed to delete order.", "error"); }
    };

    // Form Helpers
    const handleAddPOItemRow = () => setNewPOForm({ ...newPOForm, items: [...newPOForm.items, { productVariantId: '', orderedQuantity: 1, purchasePrice: 0 }] });
    const handleRemovePOItemRow = (index: number) => { const updated = [...newPOForm.items]; updated.splice(index, 1); setNewPOForm({ ...newPOForm, items: updated }); };
    const handlePOItemChange = (index: number, field: string, value: any) => { const updated = [...newPOForm.items]; (updated[index] as any)[field] = value; setNewPOForm({ ...newPOForm, items: updated }); };

    // --- RECEIVE GOODS LOGIC ---
    const openReceiveModal = (po: PurchaseOrder) => {
        const initialForm = po.items.filter(item => item.receivedQuantity < item.orderedQuantity).map(item => ({ purchaseOrderItemId: item.id, productName: `${item.productVariant?.product?.name || 'Product'} - ${item.productVariant?.weightOrSize}`, remainingToReceive: item.orderedQuantity - item.receivedQuantity, quantityAccepted: 0, quantityRejected: 0, rejectionReason: '', batchNumber: '', manufacturingDate: todayString, expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0] }));
        setReceiveForm(initialForm); setReceivingPO(po); setReceiveNotes(''); setModalError('');
    };

    const handleReceiveFormChange = (index: number, field: string, value: any) => { const updatedForm = [...receiveForm]; updatedForm[index][field] = value; setReceiveForm(updatedForm); };

    const submitGoodsReceipt = async () => {
        if (!receivingPO) return;
        setIsSubmitting(true); setModalError('');
        try {
            const payload = { purchaseOrderId: receivingPO.id, notes: receiveNotes, items: receiveForm.filter(f => f.quantityAccepted > 0 || f.quantityRejected > 0).map(f => ({ purchaseOrderItemId: f.purchaseOrderItemId, quantityAccepted: Number(f.quantityAccepted), quantityRejected: Number(f.quantityRejected), rejectionReason: f.rejectionReason, batchNumber: f.batchNumber, manufacturingDate: f.manufacturingDate, expiryDate: f.expiryDate })) };
            if (payload.items.length === 0) throw new Error("Please enter at least one received quantity.");
            for (let item of payload.items) if (item.quantityAccepted > 0 && (!item.batchNumber || !item.expiryDate)) throw new Error("Batch Number and Expiry Date are strictly required for accepted goods.");
            await axios.post(`${API_URL}/inventory/receive-goods`, payload, getAuthHeader());
            setReceivingPO(null); fetchOrders();
            showToast("Goods received and inventory updated.", "success");
        } catch (err: any) { setModalError(err.response?.data?.message || err.message || "Failed to receive goods."); } 
        finally { setIsSubmitting(false); }
    };

    const getStatusConfig = (status: number) => {
        switch (status) { case 0: return { label: 'Placed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }; case 1: return { label: 'Partially Received', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }; case 2: return { label: 'Fully Received', color: 'bg-green-500/20 text-green-400 border-green-500/30' }; case 3: return { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30' }; default: return { label: 'Unknown', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }; }
    };

    const activeOrders = orders.filter(o => o.status === 0 || o.status === 1);
    const historyOrders = orders.filter(o => o.status === 2 || o.status === 3);
    const displayOrders = activeTab === 'ACTIVE' ? activeOrders : historyOrders;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 relative">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-wide flex items-center gap-3"><Truck className="text-[#D4AF37]" size={36} /> Purchase Orders</h1>
                        <p className="text-gray-400 mt-2">Manage supplier orders and receive inventory batches.</p>
                    </div>
                    <button onClick={openCreateModal} className="bg-[#D4AF37] hover:bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-glow flex items-center gap-2">
                        <Plus size={20} /> New Purchase Order
                    </button>
                </div>
 
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('ACTIVE')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'ACTIVE' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}>Active Orders ({activeOrders.length})</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}>Purchase History</button>
                    <button onClick={() => setActiveTab('AI_AGENT')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'AI_AGENT' ? 'bg-blue-500/10 border border-blue-500 text-blue-400' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}>
                        <Bot size={18} /> AI Replenishment Agent
                    </button>
                </div>

                {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold">{error}</div>}

                {isLoading ? ( <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" /></div>
                ) : (
                    <>
                        {(activeTab === 'ACTIVE' || activeTab === 'HISTORY') && (
                            displayOrders.length === 0 ? (
                                <div className="text-center py-20 bg-[#121212] rounded-3xl border border-dashed border-white/10"><FileText className="mx-auto text-gray-500 mb-4" size={48} /><h3 className="text-xl font-bold text-gray-400">No {activeTab.toLowerCase()} purchase orders found.</h3></div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {displayOrders.map(po => {
                                        const statusInfo = getStatusConfig(po.status);
                                        const totalOrdered = po.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
                                        const totalReceived = po.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
                                        const progress = (totalReceived / totalOrdered) * 100;
                                        return (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={po.id} className="bg-[#121212] border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div><div className="text-xs text-gray-500 font-bold mb-1">PO-100{po.id}</div><h3 className="text-xl font-bold text-white">{po.supplier?.name || 'Unknown Supplier'}</h3><div className="flex items-center gap-4 mt-2 text-sm text-gray-400"><span className="flex items-center gap-1"><Calendar size={14} /> Expected: {new Date(po.expectedDeliveryDate).toLocaleDateString()}</span></div></div>
                                                        <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusInfo.color}`}>{statusInfo.label}</div>
                                                    </div>
                                                    <div className="mb-6"><div className="flex justify-between text-xs text-gray-400 mb-2"><span>Received Progress</span><span>{totalReceived} / {totalOrdered} Items</span></div><div className="w-full h-2 bg-black rounded-full overflow-hidden"><div className="h-full bg-[#D4AF37] transition-all duration-1000" style={{ width: `${progress}%` }}></div></div></div>
                                                </div>
                                                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                    <div className="text-lg font-bold">Rs. {po.totalAmount.toFixed(2)}</div>
                                                    
                                                    <div className="flex gap-2">
                                                        {activeTab === 'ACTIVE' && po.status === 0 && (
                                                            <button onClick={() => openEditModal(po)} className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors">Edit</button>
                                                        )}
                                                        {activeTab === 'ACTIVE' && (
                                                            <button onClick={() => openReceiveModal(po)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                                                                <PackageOpen size={16} /> Receive
                                                            </button>
                                                        )}
                                                        {activeTab === 'HISTORY' && (
                                                            <button onClick={() => deleteHistoricalPO(po.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-xl text-sm font-bold transition-colors" title="Delete Historical Record">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* ============================================================== */}
                        {/* AI AGENT VIEW FOR ERP SUPPLY CHAIN                             */}
                        {/* ============================================================== */}
                        {activeTab === 'AI_AGENT' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-[#121212] border border-blue-500/30 p-6 rounded-3xl shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3"><Bot className="text-blue-400"/> Autonomous ERP Replenishment</h3>
                                        <p className="text-gray-400 text-sm mt-1">Delegates LangGraph AI to forecast demand, negotiate supplier lead times, and draft POs.</p>
                                    </div>
                                    <button onClick={handleTriggerAI} disabled={isTriggeringAI} className="bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg">
                                        {isTriggeringAI ? <Loader2 size={20} className="animate-spin" /> : <Activity size={20} />} Run Forecast Engine
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-white mt-8 mb-4">Pending AI Approvals</h3>
                                {aiWorkflows.length === 0 ? (
                                    <div className="text-center py-12 bg-[#121212] rounded-3xl border border-dashed border-white/10">
                                        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
                                        <h3 className="text-xl font-bold text-gray-400">Inventory is healthy! No pending AI workflows.</h3>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {aiWorkflows.map(workflow => (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={workflow.id} className="bg-[#121212] border border-blue-500/30 rounded-3xl p-6">
                                                <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-4">
                                                    <div>
                                                        <div className="text-xs font-bold text-blue-400 mb-1 tracking-widest uppercase">ID: {workflow.id} • {new Date(workflow.createdAt).toLocaleString()}</div>
                                                        <h3 className="text-xl font-bold text-white">{workflow.workflowName}</h3>
                                                    </div>
                                                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 font-bold text-xs rounded-lg animate-pulse">AWAITING REVIEW</span>
                                                </div>
                                                
                                                <div className="mb-6">
                                                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Supplier Analysis & Negotiation</h4>
                                                    <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                        {workflow.executionSummary}
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <h4 className="text-sm font-bold text-blue-400 uppercase mb-2">Proposed Purchase Order Payload</h4>
                                                    <div className="bg-black/80 p-4 rounded-xl border border-blue-500/30 font-mono text-xs text-green-400 whitespace-pre-wrap overflow-x-auto">
                                                        {workflow.proposedPayload ? JSON.stringify(JSON.parse(workflow.proposedPayload), null, 2) : "No payload generated."}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                                    <button 
                                                        onClick={() => handleReviewAI(workflow.id, 'REJECTED', workflow.proposedPayload)} 
                                                        disabled={actionLoading === workflow.id}
                                                        className="px-6 py-2 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                                                    >
                                                        Reject Action
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReviewAI(workflow.id, 'APPROVED', workflow.proposedPayload)} 
                                                        disabled={actionLoading === workflow.id}
                                                        className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-lg flex items-center gap-2"
                                                    >
                                                        {actionLoading === workflow.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Approve & Send PO
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ============================================================== */}
                {/* CREATE / EDIT PURCHASE ORDER MODAL                             */}
                {/* ============================================================== */}
                <AnimatePresence>
                    {isCreatingPO && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setIsCreatingPO(false)}></motion.div>
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-4xl w-full z-10 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        {editingPOId ? <Edit2 className="text-[#D4AF37]"/> : <Plus className="text-[#D4AF37]"/>} 
                                        {editingPOId ? `Edit Purchase Order (PO-100${editingPOId})` : 'Create Purchase Order'}
                                    </h2>
                                    <button onClick={() => setIsCreatingPO(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                                </div>

                                {modalError && (
                                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold flex items-center gap-2">
                                        <AlertTriangle size={18} /> {modalError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Select Supplier <span className="text-red-400">*</span></label>
                                        {!isCreatingNewSupplier ? (
                                            <div className="flex gap-2">
                                                <select value={newPOForm.supplierId} onChange={(e) => setNewPOForm({...newPOForm, supplierId: e.target.value})} className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none appearance-none">
                                                    <option value=""> Choose Supplier </option>
                                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                                <button onClick={() => setIsCreatingNewSupplier(true)} className="bg-white/10 hover:bg-white/20 px-4 rounded-xl text-xs font-bold transition-colors">Add New</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Enter new supplier name..." value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} className="flex-1 bg-black/50 border border-[#D4AF37] rounded-xl px-4 py-3 text-white focus:border-yellow-400 outline-none" autoFocus />
                                                <button onClick={() => setIsCreatingNewSupplier(false)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 rounded-xl text-xs font-bold transition-colors">Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Expected Delivery Date <span className="text-red-400">*</span></label>
                                        {/* STRICT DATE VALIDATION: Prevents user from selecting past dates in HTML5 picker */}
                                        <input type="date" min={todayString} value={newPOForm.expectedDeliveryDate} onChange={(e) => setNewPOForm({...newPOForm, expectedDeliveryDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none" />
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                        <h3 className="font-bold text-lg text-white">Order Items</h3>
                                    </div>
                                    
                                    {newPOForm.items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-4 items-end bg-black/30 p-4 rounded-xl border border-white/5">
                                            <div className="col-span-12 md:col-span-6">
                                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Product Variant</label>
                                                <select value={item.productVariantId} onChange={(e) => handlePOItemChange(index, 'productVariantId', e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white outline-none">
                                                    <option value="">Select product...</option>
                                                    {variants.map(v => <option key={v.id} value={v.id}>{v.productName} ({v.weightOrSize}) - {v.sku}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-6 md:col-span-2">
                                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Qty</label>
                                                <input type="number" min="1" value={item.orderedQuantity} onChange={(e) => handlePOItemChange(index, 'orderedQuantity', e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white outline-none" />
                                            </div>
                                            <div className="col-span-6 md:col-span-3">
                                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Unit Price (Rs)</label>
                                                <input type="number" min="0" value={item.purchasePrice} onChange={(e) => handlePOItemChange(index, 'purchasePrice', e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white outline-none" />
                                            </div>
                                            <div className="col-span-12 md:col-span-1 text-right">
                                                <button onClick={() => handleRemovePOItemRow(index)} disabled={newPOForm.items.length === 1} className="p-2 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30"><Trash2 size={20}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <button onClick={handleAddPOItemRow} className="text-sm font-bold text-[#D4AF37] hover:text-yellow-400 flex items-center gap-1"><Plus size={16}/> Add another item</button>
                                </div>

                                <div className="flex justify-end gap-4 mt-8 border-t border-white/10 pt-6">
                                    <button onClick={() => setIsCreatingPO(false)} disabled={isSubmitting} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={submitNewPO} disabled={isSubmitting} className="px-8 py-3 bg-[#D4AF37] text-black rounded-xl font-bold shadow-glow hover:bg-yellow-500 transition-colors flex items-center gap-2">
                                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />} 
                                        {editingPOId ? 'Save Changes' : 'Place Order'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ============================================================== */}
                {/* RECEIVE GOODS MODAL                                            */}
                {/* ============================================================== */}
                <AnimatePresence>
                    {receivingPO && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setReceivingPO(null)}></motion.div>
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-4xl w-full z-10 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-3"><PackageOpen className="text-[#D4AF37]"/> Receive Goods: PO-100{receivingPO.id}</h2>
                                    <button onClick={() => setReceivingPO(null)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                                </div>
                                
                                {modalError && (
                                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold flex items-center gap-2">
                                        <AlertTriangle size={18} /> {modalError}
                                    </div>
                                )}

                                <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl mb-6 flex gap-3 text-orange-400">
                                    <AlertTriangle className="flex-shrink-0" />
                                    <p className="text-sm">Enter the exact quantities received. <strong>Batch Number and Expiry Date are strictly required</strong> to initialize the FEFO (First-Expired, First-Out) inventory engine.</p>
                                </div>
                                <div className="space-y-6">
                                    {receiveForm.map((formItem, index) => (
                                        <div key={index} className="p-5 bg-black/50 border border-white/5 rounded-2xl">
                                            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                                                <h3 className="font-bold text-white text-lg">{formItem.productName}</h3>
                                                <span className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-lg">Remaining: {formItem.remainingToReceive}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                                <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Qty Accepted</label><input type="number" min="0" max={formItem.remainingToReceive} value={formItem.quantityAccepted} onChange={(e) => handleReceiveFormChange(index, 'quantityAccepted', e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-green-500 outline-none" /></div>
                                                <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Batch Number <span className="text-red-400">*</span></label><input type="text" placeholder="e.g. BATCH-2026-A" value={formItem.batchNumber} onChange={(e) => handleReceiveFormChange(index, 'batchNumber', e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none" /></div>
                                                
                                                {/* STRICT DATE VALIDATION: Manufacture Date cannot be Future, Expiry Date cannot be Past */}
                                                <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Mfg Date</label><input type="date" max={todayString} value={formItem.manufacturingDate} onChange={(e) => handleReceiveFormChange(index, 'manufacturingDate', e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none" /></div>
                                                <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Expiry Date <span className="text-red-400">*</span></label><input type="date" min={todayString} value={formItem.expiryDate} onChange={(e) => handleReceiveFormChange(index, 'expiryDate', e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none" /></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 opacity-80">
                                                <div><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Qty Rejected</label><input type="number" min="0" value={formItem.quantityRejected} onChange={(e) => handleReceiveFormChange(index, 'quantityRejected', e.target.value)} className="w-full bg-[#1A1A1A] border border-red-500/30 rounded-xl px-3 py-2 text-red-400 focus:border-red-500 outline-none" /></div>
                                                <div className="md:col-span-3"><label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Rejection Reason</label><input type="text" placeholder="e.g. Damaged in transit" value={formItem.rejectionReason} onChange={(e) => handleReceiveFormChange(index, 'rejectionReason', e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2 text-gray-400 outline-none" /></div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-white/10">
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Receiving Notes</label>
                                        <textarea rows={3} value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="General notes about this delivery..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none"></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 mt-8">
                                    <button onClick={() => setReceivingPO(null)} disabled={isSubmitting} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={submitGoodsReceipt} disabled={isSubmitting} className="px-8 py-3 bg-[#D4AF37] text-black rounded-xl font-bold shadow-glow hover:bg-yellow-500 transition-colors flex items-center gap-2">
                                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />} Confirm Goods Receipt
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}