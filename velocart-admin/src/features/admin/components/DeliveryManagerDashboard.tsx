import { useState,useEffect } from 'react';
import { motion,AnimatePresence } from 'framer-motion';
import { Truck,FileText,CheckCircle,Clock,AlertTriangle,X,Loader2,Printer,MapPin,Edit,User,HelpCircle,Activity,CheckCircle2,Bot,Banknote } from 'lucide-react';
import axios from 'axios';
import { getPendingDisputeWorkflows,triggerDisputeAIWorkflow,updateWorkflowStatus,executeAIResolutions,processRefund } from '../api/deliveryApi';
// --- NEW MAP IMPORTS ---
import { MapContainer,TileLayer,Marker,Popup,useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons not showing up in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
// -----------------------

const API_URL='http://localhost:5176/api';
const getAuthHeader=() => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function DeliveryManagerDashboard() {
    const [orders,setOrders]=useState<any[]>([]);
    const [isLoading,setIsLoading]=useState(true);
    const [error,setError]=useState('');
    const [actionLoading,setActionLoading]=useState<number | null>(null);
    const [toast,setToast]=useState<{message: string,type: 'success' | 'error'} | null>(null);
    
    // NEW AI STATES
    const [activeTab,setActiveTab]=useState<'ORDERS' | 'COMPLAINTS' | 'AI_ADJUDICATOR'>('ORDERS');
    const [aiWorkflows,setAiWorkflows]=useState<any[]>([]);
    const [isTriggeringAI,setIsTriggeringAI]=useState(false);

    // --- MODAL STATES ---
    const [deliveryModalPO,setDeliveryModalPO]=useState<any | null>(null);
    const [deliveryForm,setDeliveryForm]=useState({ deliveryNumber: '',estimatedDeliveryDate: '',estimatedDeliveryTime: '',assignedDriverName: '',assignedDriverContact: '',deliveryNotes: '' });
    
    const [invoiceModalPO,setInvoiceModalPO]=useState<any | null>(null);
    const [invoiceData,setInvoiceData]=useState<any | null>(null);
    const [confirmModal,setConfirmModal]=useState<{ isOpen: boolean,orderId: number | null,newStatus: string }>({ isOpen: false,orderId: null,newStatus: '' });
    const [resolveModalId,setResolveModalId]=useState<number | null>(null);
    const [refundModalId,setRefundModalId]=useState<number | null>(null);
    const [orderLocations,setOrderLocations]=useState<any[]>([]);
    const [newLocation,setNewLocation]=useState<{lat: number,lng: number,placeName: string} | null>(null);

    function LocationPicker() {
        useMapEvents({
            click: async (e) => {
                const { lat,lng }=e.latlng;
                try {
                    // 100% Free OpenStreetMap Nominatim API
                    const res=await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const placeName=res.data.display_name || "Unknown Location";
                    setNewLocation({ lat,lng,placeName });
                } catch (error) {
                    setNewLocation({ lat,lng,placeName: "Custom Pinned Location" });
                }
            }
        });
        return null;
    }

    const showToast=(message: string,type: 'success' | 'error') => { setToast({ message,type }); setTimeout(() => setToast(null),4000); };

    useEffect(() => { 
        if(activeTab === 'AI_ADJUDICATOR') fetchAIWorkflows();
        else fetchOrders(); 
    },[activeTab]);

    const fetchOrders=async () => {
        setIsLoading(true); setError('');
        try {
            const response=await axios.get(`${API_URL}/orders/delivery-management/orders`,getAuthHeader());
            setOrders(response.data);
        } catch (err: any) { setError(err.response?.data?.message || "Failed to load active orders."); } 
        finally { setIsLoading(false); }
    };

    // --- NEW: AI WORKFLOW LOGIC ---
    const fetchAIWorkflows=async () => {
        setIsLoading(true);
        try {
            const res=await getPendingDisputeWorkflows();
            // Filter so Delivery Manager ONLY sees Dispute Adjudicator tasks,not FEFO tasks
            const disputeTasks=res.filter((w: any) => w.workflowName.includes('Adjudicate'));
            setAiWorkflows(disputeTasks);
        } catch (err) { showToast("Failed to fetch pending AI tasks.","error"); }
        finally { setIsLoading(false); }
    };

    const handleTriggerAI=async () => {
        setIsTriggeringAI(true);
        try {
            const res=await triggerDisputeAIWorkflow();
            showToast(res.message,"success");
            setTimeout(() => fetchAIWorkflows(),5000); 
        } catch (err: any) {
            showToast("Failed to trigger Dispute AI Service.","error");
        } finally {
            setIsTriggeringAI(false);
        }
    };

    const handleReviewAI=async (id: number,status: 'APPROVED' | 'REJECTED',payloadStr: string) => {
        setActionLoading(id);
        try {
            if(status === 'APPROVED') {
                // STEP 1: Safely Parse JSON FIRST
                let payload;
                try {
                    payload=payloadStr ? JSON.parse(payloadStr) : null;
                    if(!payload) throw new Error("Empty payload");
                } catch (parseError) {
                    showToast("AI generated invalid data. Rejecting workflow.","error");
                    // Auto-reject so the bad data doesn't get stuck in the UI
                    await updateWorkflowStatus(id,'REJECTED'); 
                    fetchAIWorkflows();
                    setActionLoading(null);
                    return;
                }

                // STEP 2: Execute the Resolution FIRST
                await executeAIResolutions(payload);
                
                // STEP 3: ONLY mark as Approved if the execution succeeded!
                await updateWorkflowStatus(id,status);
                showToast("AI Dispute Resolutions Approved and Executed!","success");
            } else {
                // If the user just clicked "Reject",we just update the status safely
                await updateWorkflowStatus(id,status);
                showToast("AI Resolutions Rejected.","success");
            }
            
            fetchAIWorkflows();
            fetchOrders(); // Refresh orders in background so complaints show as resolved
        } catch (err: any) {
            showToast(err.response?.data?.message || err.response?.data || "Failed to execute AI workflow.","error");
        } finally {
            setActionLoading(null);
        }
    };

    // --- WORKFLOW ACTIONS ---
    const promptStatusUpdate=(orderId: number,newStatus: string) => {
        setConfirmModal({ isOpen: true,orderId,newStatus });
    };

    const executeStatusUpdate=async () => {
        const { orderId,newStatus }=confirmModal;
        if(!orderId) return;

        setConfirmModal({ isOpen: false,orderId: null,newStatus: '' }); 
        setActionLoading(orderId);
        
        try {
            await axios.put(`${API_URL}/orders/delivery-management/${orderId}/status`,{ status: newStatus },getAuthHeader());
            fetchOrders();
            showToast(`Order status updated to ${newStatus}`,"success");
        } catch (err: any) { 
            showToast(err.response?.data?.message || "Failed to update status.","error"); 
        } 
        finally { setActionLoading(null); }
    };

    const openDeliveryModal=async (order: any) => {
        const details=order.deliveryDetail || {};
        setDeliveryForm({
            deliveryNumber: details.deliveryNumber || `DEL-${new Date().getFullYear()}-${order.id}`,
            estimatedDeliveryDate: details.estimatedDeliveryDate ? details.estimatedDeliveryDate.split('T')[0] : '',
            estimatedDeliveryTime: details.estimatedDeliveryTime || '',
            assignedDriverName: details.assignedDriverName || '',
            assignedDriverContact: details.assignedDriverContact || '',
            deliveryNotes: details.deliveryNotes || ''
        });
        setDeliveryModalPO(order);
        setNewLocation(null);

        // Fetch existing map locations
        try {
            const res=await axios.get(`${API_URL}/orders/${order.id}/locations`,getAuthHeader());
            setOrderLocations(res.data);
        } catch (err) { console.error("Failed to load locations"); }
    };

    const submitDeliveryDetails=async () => {
        if(!deliveryForm.estimatedDeliveryDate) return showToast("Estimated Delivery Date is required.","error");
        setActionLoading(deliveryModalPO.id);
        try {
            await axios.put(`${API_URL}/orders/delivery-management/${deliveryModalPO.id}/delivery-details`,deliveryForm,getAuthHeader());
            setDeliveryModalPO(null);
            fetchOrders();
            showToast("Delivery details updated successfully.","success");
        } catch (err: any) { showToast(err.response?.data?.message || "Failed to save delivery details.","error"); } 
        finally { setActionLoading(null); }
    };

    const submitLocationUpdate=async () => {
        if(!newLocation) return;
        setActionLoading(deliveryModalPO.id);
        try {
            const payload={ latitude: newLocation.lat,longitude: newLocation.lng,placeName: newLocation.placeName };
            await axios.post(`${API_URL}/orders/delivery-management/${deliveryModalPO.id}/location`,payload,getAuthHeader());
            
            // Refresh locations list instantly
            const res=await axios.get(`${API_URL}/orders/${deliveryModalPO.id}/locations`,getAuthHeader());
            setOrderLocations(res.data);
            setNewLocation(null);
            showToast("Location updated on map.","success");
        } catch (err: any) { 
            showToast(err.response?.data?.message || "Failed to update location.","error"); 
        } finally { 
            setActionLoading(null); 
        }
    };

    const openInvoiceModal=async (order: any) => {
        setActionLoading(order.id);
        try {
            const res=await axios.get(`${API_URL}/orders/${order.id}/invoice`);
            setInvoiceData(res.data);
            setInvoiceModalPO(order);
        } catch (err: any) { showToast("Failed to generate invoice data.","error"); } 
        finally { setActionLoading(null); }
    };

    const handlePrintInvoice=() => {
        const printContent=document.getElementById('printable-invoice');
        if(!printContent) return;
        
        const originalContents=document.body.innerHTML;
        document.body.innerHTML=printContent.innerHTML;
        window.print();
        document.body.innerHTML=originalContents;
        window.location.reload(); 
    };

    const getStatusBadge=(status: string) => {
        switch (status) {
            case 'PENDING': return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-bold">Pending Payment</span>;
            case 'VALIDATING': return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold">Validating</span>;
            case 'CONFIRMED': return <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-bold">Confirmed</span>;
            case 'DELIVERING': return <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs font-bold">Delivering</span>;
            case 'DELIVERED': return <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold tracking-wide">Delivered (Awaiting Confirmation)</span>;
            default: return <span className="px-3 py-1 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    const handleResolveComplaint=async () => {
        if(!resolveModalId) return;
        try {
            await axios.put(`${API_URL}/orders/delivery-management/complaints/${resolveModalId}/resolve`,{},getAuthHeader());
            fetchOrders();
            showToast("Complaint marked as resolved.","success");
        } catch (err: any) { showToast(err.response?.data?.message || "Failed to resolve complaint.","error"); }
        finally { setResolveModalId(null); }
    };

    // --- NEW: PROCESS REFUND ACTION ---
    const handleProcessRefund=async () => {
        if(!refundModalId) return;
        setActionLoading(refundModalId);
        try {
            const res=await processRefund(refundModalId);
            fetchOrders();
            showToast(res.message,"success");
        } catch (err: any) { 
            showToast(err.response?.data?.message || "Failed to process refund.","error"); 
        } finally {
            setActionLoading(null);
            setRefundModalId(null);
        }
    };

    const displayOrders=activeTab === 'ORDERS' ? orders.filter(o => !o.hasOpenComplaints) : orders.filter(o => o.hasOpenComplaints);

    return (
        <div className="min-h-screen bg-[#0B1F33] text-white p-8 relative">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0,y: -50 }} animate={{ opacity: 1,y: 0 }} exit={{ opacity: 0,y: -50 }} className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-wide flex items-center gap-3"><Truck className="text-[#D4AF37]" size={36} /> Delivery Manager</h1>
                        <p className="text-gray-400 mt-2">Validate orders,manage delivery routing,and resolve customer complaints.</p>
                    </div>
                </div>

                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('ORDERS')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'ORDERS' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}>
                        <Clock size={18} /> Active Deliveries ({orders.filter(o => !o.hasOpenComplaints).length})
                    </button>
                    <button onClick={() => setActiveTab('COMPLAINTS')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'COMPLAINTS' ? 'bg-red-500/10 border border-red-500 text-red-400' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}>
                        <AlertTriangle size={18} /> Open Complaints ({orders.filter(o => o.hasOpenComplaints).length})
                    </button>
                    {/* NEW AI TAB */}
                    <button onClick={() => setActiveTab('AI_ADJUDICATOR')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'AI_ADJUDICATOR' ? 'bg-orange-500/10 border border-orange-500 text-orange-400' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}>
                        <Bot size={18} /> AI Adjudicator Agent
                    </button>
                </div>

                {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold">{error}</div>}

                {isLoading ? ( <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" /></div>
                ) : (
                    <>
                        {/* STANDARD VIEWS */}
                        {(activeTab === 'ORDERS' || activeTab === 'COMPLAINTS') && (
                            displayOrders.length === 0 ? (
                                <div className="text-center py-20 bg-[#121212] rounded-3xl border border-dashed border-white/10"><FileText className="mx-auto text-gray-500 mb-4" size={48} /><h3 className="text-xl font-bold text-gray-400">No orders found in this category.</h3></div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {displayOrders.map(order => (
                                        <motion.div initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }} key={order.id} className={`bg-[#121212] border ${order.hasOpenComplaints ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5'} rounded-3xl p-6 flex flex-col`}>
                                            <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                                                <div>
                                                    <div className="text-xs text-gray-500 font-bold mb-1">{order.orderNumber}</div>
                                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                        <User size={18} className="text-[#D4AF37]"/> {order.customerName}
                                                    </h3>
                                                    <div className="text-sm text-gray-400 mt-1 flex items-center gap-1"><MapPin size={14}/> {order.deliveryAddress}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="mb-2">{getStatusBadge(order.orderStatus)}</div>
                                                    <div className="text-lg font-bold text-[#D4AF37]">Rs. {order.grandTotal.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">{order.paymentMethod} • {order.paymentStatus}</div>
                                                </div>
                                            </div>

                                           {/* Complaints Section */}
                                            {order.hasOpenComplaints && (
                                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                    <h4 className="font-bold text-red-400 flex items-center gap-2 mb-3"><AlertTriangle size={16}/> Customer Complaints</h4>
                                                    {order.complaints?.map((c: any) => (
                                                        <div key={c.id} className="bg-black/40 p-4 rounded-lg border border-red-500/10 mb-2 last:mb-0">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <strong className="text-white block">{c.subject}</strong>
                                                                <span className="text-[10px] text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-gray-400 text-sm mb-4">{c.description}</p>

                                                            {/* NEW: RENDER THE PHOTO EVIDENCE */}
                                                            {c.imageUrl && (
                                                                <div className="mb-4">
                                                                    <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Photo Evidence</span>
                                                                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black max-w-xs cursor-pointer hover:border-orange-500/50 transition-colors"
                                                                        onClick={() => window.open(c.imageUrl,'_blank')}
                                                                    >
                                                                        <img src={c.imageUrl} alt="Complaint Evidence" className="w-full h-auto object-cover max-h-48" />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* --- NEW: ADMIN REFUND PROCESSING UI --- */}
                                                            {c.status === 'RESOLUTION_OFFERED' ? (
                                                                <div className="mt-4 pt-4 border-t border-red-500/20">
                                                                    <div className="text-xs text-orange-400 font-bold mb-2">
                                                                        AI Proposed Refund: Rs. {c.refundAmount?.toFixed(2)}
                                                                    </div>
                                                                    {c.refundStatus === 'Pending_Customer_Choice' ? (
                                                                        <div className="text-xs text-gray-400 italic">Waiting for customer to select refund method...</div>
                                                                    ) : c.refundStatus === 'Processing' ? (
                                                                        <button 
                                                                            disabled={actionLoading === c.id}
                                                                            onClick={() => setRefundModalId(c.id)}
                                                                            className="w-full mt-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                                                        >
                                                                            {actionLoading === c.id ? <Loader2 size={14} className="animate-spin"/> : <Banknote size={14} />} Mark Refund as Processed (Stripe)
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            ) : (
                                                            
                                                            <button onClick={() => setResolveModalId(c.id)} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                                                                <CheckCircle size={14} /> Mark as Resolved
                                                            </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {order.deliveryDetail && (
                                                <div className="mb-6 p-4 bg-black/30 rounded-xl border border-white/5 grid grid-cols-2 gap-4 text-sm">
                                                    <div><span className="text-gray-500 block text-xs font-bold">Driver</span><span className="text-gray-300">{order.deliveryDetail.assignedDriverName || 'Unassigned'}</span></div>
                                                    <div><span className="text-gray-500 block text-xs font-bold">Est. Date</span><span className="text-gray-300">{order.deliveryDetail.estimatedDeliveryDate ? new Date(order.deliveryDetail.estimatedDeliveryDate).toLocaleDateString() : 'TBD'}</span></div>
                                                </div>
                                            )}

                                            <div className="mt-auto pt-4 flex flex-wrap justify-end gap-3 border-t border-white/5">
                                                <button onClick={() => openInvoiceModal(order)} disabled={actionLoading === order.id} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                                                    {actionLoading === order.id ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16} />} View Receipt
                                                </button>

                                                {order.orderStatus === 'PENDING' && (
                                                    <button onClick={() => promptStatusUpdate(order.id,'VALIDATING')} disabled={actionLoading === order.id} className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/30 rounded-xl text-sm font-bold transition-colors shadow-lg">
                                                        Begin Validation
                                                    </button>
                                                )}

                                                {order.orderStatus === 'VALIDATING' && (
                                                    <button onClick={() => promptStatusUpdate(order.id,'CONFIRMED')} disabled={actionLoading === order.id} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg">
                                                        Confirm Order
                                                    </button>
                                                )}

                                                {(order.orderStatus === 'CONFIRMED' || order.orderStatus === 'DELIVERING') && (
                                                    <button onClick={() => openDeliveryModal(order)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                                                        <Edit size={16} /> Manage Delivery Info
                                                    </button>
                                                )}

                                                {order.orderStatus === 'CONFIRMED' && (
                                                    <button onClick={() => promptStatusUpdate(order.id,'DELIVERING')} disabled={actionLoading === order.id} className="px-4 py-2 bg-[#D4AF37] hover:bg-yellow-500 text-black rounded-xl text-sm font-bold shadow-glow transition-colors">
                                                        Distribute / Dispatch
                                                    </button>
                                                )}

                                                {order.orderStatus === 'DELIVERING' && (
                                                    <button onClick={() => promptStatusUpdate(order.id,'DELIVERED')} disabled={actionLoading === order.id} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg transition-colors">
                                                        Mark as Delivered
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ============================================================== */}
                        {/* NEW: AI AGENT VIEW FOR DELIVERY MANAGER                        */}
                        {/* ============================================================== */}
                        {activeTab === 'AI_ADJUDICATOR' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-[#121212] border border-orange-500/30 p-6 rounded-3xl shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3"><Bot className="text-orange-400"/> Intelligent Dispute Adjudicator</h3>
                                        <p className="text-gray-400 text-sm mt-1">Delegates open complaints to LangGraph AI to investigate policy context and propose fair resolutions.</p>
                                    </div>
                                    <button onClick={handleTriggerAI} disabled={isTriggeringAI} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg">
                                        {isTriggeringAI ? <Loader2 size={20} className="animate-spin" /> : <Activity size={20} />} Start AI Adjudication
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-white mt-8 mb-4">Pending AI Approvals</h3>
                                {aiWorkflows.length === 0 ? (
                                    <div className="text-center py-12 bg-[#121212] rounded-3xl border border-dashed border-white/10">
                                        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
                                        <h3 className="text-xl font-bold text-gray-400">All caught up! No pending AI workflows.</h3>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {aiWorkflows.map(workflow => (
                                            <motion.div initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }} key={workflow.id} className="bg-[#121212] border border-orange-500/30 rounded-3xl p-6">
                                                <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-4">
                                                    <div>
                                                        <div className="text-xs font-bold text-orange-400 mb-1 tracking-widest uppercase">ID: {workflow.id} • {new Date(workflow.createdAt).toLocaleString()}</div>
                                                        <h3 className="text-xl font-bold text-white">{workflow.workflowName}</h3>
                                                    </div>
                                                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 font-bold text-xs rounded-lg animate-pulse">AWAITING REVIEW</span>
                                                </div>
                                                
                                                <div className="mb-6">
                                                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Policy Investigation & Analysis</h4>
                                                    <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                        {workflow.executionSummary}
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <h4 className="text-sm font-bold text-orange-400 uppercase mb-2">Proposed Resolution Payload</h4>
                                                    <div className="bg-black/80 p-4 rounded-xl border border-orange-500/30 font-mono text-xs text-green-400 whitespace-pre-wrap overflow-x-auto">
                                                        {workflow.proposedPayload ? JSON.stringify(JSON.parse(workflow.proposedPayload),null,2) : "No payload generated."}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                                    <button 
                                                        onClick={() => handleReviewAI(workflow.id,'REJECTED',workflow.proposedPayload)} 
                                                        disabled={actionLoading === workflow.id}
                                                        className="px-6 py-2 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                                                    >
                                                        Reject Action
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReviewAI(workflow.id,'APPROVED',workflow.proposedPayload)} 
                                                        disabled={actionLoading === workflow.id}
                                                        className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-lg flex items-center gap-2"
                                                    >
                                                        {actionLoading === workflow.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Approve & Execute Resolutions
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
                {/* STATUS CONFIRMATION MODAL                                      */}
                {/* ============================================================== */}
                <AnimatePresence>
                    {confirmModal.isOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmModal({ isOpen: false,orderId: null,newStatus: '' })}></motion.div>
                            <motion.div initial={{ opacity: 0,scale: 0.95,y: 20 }} animate={{ opacity: 1,scale: 1,y: 0 }} exit={{ opacity: 0,scale: 0.95,y: 20 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                                <button onClick={() => setConfirmModal({ isOpen: false,orderId: null,newStatus: '' })} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                                
                                <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center mb-6">
                                    <HelpCircle size={32} />
                                </div>
                                
                                <h3 className="text-xl font-bold text-white mb-2">Confirm Status Change</h3>
                                <p className="text-gray-400 text-sm mb-8">
                                    Are you sure you want to move this order to <strong className="text-white">{confirmModal.newStatus}</strong>?
                                </p>
                                
                                <div className="flex gap-3">
                                    <button onClick={() => setConfirmModal({ isOpen: false,orderId: null,newStatus: '' })} className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={executeStatusUpdate} className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-colors">
                                        Yes,Update
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ============================================================== */}
                {/* PDF INVOICE MODAL                                              */}
                {/* ============================================================== */}
                <AnimatePresence>
                    {invoiceModalPO && invoiceData && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setInvoiceModalPO(null)}></motion.div>
                            <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-2xl w-full z-10 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-3"><FileText className="text-[#D4AF37]"/> Receipt / Invoice</h2>
                                    <div className="flex gap-3">
                                        <button onClick={handlePrintInvoice} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Printer size={16}/> Print PDF</button>
                                        <button onClick={() => setInvoiceModalPO(null)} className="text-gray-500 hover:text-white p-2"><X size={24} /></button>
                                    </div>
                                </div>
                                <div id="printable-invoice" className="bg-white text-black p-8 rounded-xl print:m-0 print:p-0">
                                    <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
                                        <div>
                                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">VELOCART</h1>
                                            <p className="text-gray-500 text-sm mt-1">Official Tax Invoice</p>
                                        </div>
                                        <div className="text-right">
                                            <h3 className="font-bold text-gray-800 text-lg">{invoiceData.orderNumber}</h3>
                                            <p className="text-gray-500 text-sm">Date: {new Date(invoiceData.orderDate).toLocaleDateString()}</p>
                                            <p className="text-gray-500 text-sm font-bold mt-1 uppercase">{invoiceData.paymentMethod} • {invoiceData.paymentStatus}</p>
                                        </div>
                                    </div>
                                    <div className="mb-8">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Billed To:</h4>
                                        <p className="font-bold text-lg">{invoiceData.customerName}</p>
                                        <p className="text-gray-600">{invoiceData.customerEmail}</p>
                                        <p className="text-gray-600 mt-2 max-w-xs">{invoiceData.customerAddress}</p>
                                    </div>
                                    <table className="w-full text-left mb-8 border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-gray-800">
                                                <th className="py-3 text-sm font-bold uppercase tracking-wider text-gray-600">Item Description</th>
                                                <th className="py-3 text-center text-sm font-bold uppercase tracking-wider text-gray-600">Qty</th>
                                                <th className="py-3 text-right text-sm font-bold uppercase tracking-wider text-gray-600">Price</th>
                                                <th className="py-3 text-right text-sm font-bold uppercase tracking-wider text-gray-600">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {invoiceData.items?.map((item: any,idx: number) => (
                                                <tr key={idx}>
                                                    <td className="py-4"><div className="font-bold text-gray-900">{item.productName}</div><div className="text-sm text-gray-500">{item.variantName}</div></td>
                                                    <td className="py-4 text-center text-gray-800 font-bold">{item.quantity}</td>
                                                    <td className="py-4 text-right text-gray-600">Rs. {item.unitPrice.toFixed(2)}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900">Rs. {item.total.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="flex justify-end border-t-2 border-gray-200 pt-6">
                                        <div className="w-64 space-y-3">
                                            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Rs. {invoiceData.subtotal.toFixed(2)}</span></div>
                                            <div className="flex justify-between text-gray-600"><span>Discount</span><span>-Rs. {invoiceData.discountAmount.toFixed(2)}</span></div>
                                            <div className="flex justify-between text-gray-600"><span>Tax (8%)</span><span>Rs. {invoiceData.taxAmount.toFixed(2)}</span></div>
                                            <div className="flex justify-between text-gray-600"><span>Delivery</span><span>Rs. {invoiceData.deliveryFee.toFixed(2)}</span></div>
                                            <div className="flex justify-between font-black text-xl border-t border-gray-200 pt-3 text-gray-900"><span>Total</span><span>Rs. {invoiceData.grandTotal.toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ============================================================== */}
                {/* DELIVERY DETAILS MANAGEMENT MODAL                              */}
                {/* ============================================================== */}
                <AnimatePresence>
                    {deliveryModalPO && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !actionLoading && setDeliveryModalPO(null)}></motion.div>
                            <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0,scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-3"><Edit className="text-blue-400"/> Manage Delivery Details</h2>
                                    <button onClick={() => setDeliveryModalPO(null)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Tracking / Delivery Number</label>
                                        <input type="text" value={deliveryForm.deliveryNumber} onChange={e => setDeliveryForm({...deliveryForm,deliveryNumber: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Est. Date <span className="text-red-400">*</span></label>
                                            <input type="date" min={new Date().toISOString().split('T')[0]} value={deliveryForm.estimatedDeliveryDate} onChange={e => setDeliveryForm({...deliveryForm,estimatedDeliveryDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Est. Time</label>
                                            <input type="text" placeholder="e.g. 14:00 - 16:00" value={deliveryForm.estimatedDeliveryTime} onChange={e => setDeliveryForm({...deliveryForm,estimatedDeliveryTime: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Assigned Driver Name</label>
                                        <input type="text" value={deliveryForm.assignedDriverName} onChange={e => setDeliveryForm({...deliveryForm,assignedDriverName: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Driver Contact Info</label>
                                        <input type="text" value={deliveryForm.assignedDriverContact} onChange={e => setDeliveryForm({...deliveryForm,assignedDriverContact: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Delivery Notes (Visible to Customer)</label>
                                        <textarea rows={3} value={deliveryForm.deliveryNotes} onChange={e => setDeliveryForm({...deliveryForm,deliveryNotes: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-400 outline-none"></textarea>
                                    </div>
                                </div>
                                {/* --- NEW MAP UI INSIDE MODAL --- */}
                                    <div className="mt-6 border-t border-white/10 pt-6">
                                        <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                                            <MapPin size={16} className="text-blue-400" /> Live Location Tracking
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-3">Click on the map to log the order's current location.</p>
                                        
                                        <div className="h-64 w-full rounded-xl overflow-hidden border border-white/10 relative z-0">
                                            {/* Centered roughly around Colombo/Malabe */}
                                            <MapContainer center={[6.9271,79.8612]} zoom={11} style={{ height: '100%',width: '100%',zIndex: 1 }}>
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                <LocationPicker />
                                                
                                                {/* Existing History Pins */}
                                                {orderLocations.map((loc,i) => (
                                                    <Marker key={i} position={[loc.latitude,loc.longitude]}>
                                                        <Popup>{loc.placeName} <br/> <span className="text-xs text-gray-500">{new Date(loc.timestamp).toLocaleTimeString()}</span></Popup>
                                                    </Marker>
                                                ))}

                                                {/* New Pin Being Dropped */}
                                                {newLocation && (
                                                    <Marker position={[newLocation.lat,newLocation.lng]}>
                                                        <Popup>New Pin: {newLocation.placeName}</Popup>
                                                    </Marker>
                                                )}
                                            </MapContainer>
                                        </div>
                                        
                                        {/* Drop Pin Action Bar */}
                                        {newLocation && (
                                            <div className="mt-3 bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex justify-between items-center">
                                                <div className="text-xs text-blue-200 truncate flex-1 pr-4">{newLocation.placeName}</div>
                                                <button onClick={submitLocationUpdate} disabled={actionLoading === deliveryModalPO.id} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0">
                                                    {actionLoading === deliveryModalPO.id ? <Loader2 size={14} className="animate-spin"/> : <MapPin size={14} />} Drop Pin
                                                </button>
                                            </div>
                                        )}

                                        {/* Tracking History List */}
                                        {orderLocations.length > 0 && (
                                            <div className="mt-4 max-h-32 overflow-y-auto space-y-2 custom-scrollbar border border-white/5 rounded-xl p-2 bg-black/20">
                                                {orderLocations.map((loc,i) => (
                                                    <div key={i} className="flex justify-between items-center p-2 rounded-lg text-xs border border-white/5 bg-[#1A1A1A]">
                                                        <span className="text-gray-300 truncate pr-2 flex-1">📍 {loc.placeName}</span>
                                                        <span className="text-gray-500 shrink-0">{new Date(loc.timestamp).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* ------------------------------- */}
                                <div className="flex justify-end gap-3 mt-8">
                                    <button onClick={() => setDeliveryModalPO(null)} className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={submitDeliveryDetails} disabled={actionLoading === deliveryModalPO.id} className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors">
                                        {actionLoading === deliveryModalPO.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16}/>} Save Details
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ============================================================== */}
                {/* RESOLVE COMPLAINT MODAL                                        */}
                {/* ============================================================== */}
                <AnimatePresence>
                    {resolveModalId && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setResolveModalId(null)}></motion.div>
                            <motion.div initial={{ opacity: 0,scale: 0.95,y: 20 }} animate={{ opacity: 1,scale: 1,y: 0 }} exit={{ opacity: 0,scale: 0.95,y: 20 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                                <button onClick={() => setResolveModalId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                                <div className="mx-auto w-16 h-16 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Resolve Complaint?</h3>
                                <p className="text-gray-400 text-sm mb-8">Are you sure you want to mark this complaint as resolved?</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setResolveModalId(null)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                    <button onClick={handleResolveComplaint} className="flex-1 px-4 py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg transition-colors">Yes,Resolve</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ============================================================== */}
                {/* PROCESS REFUND MODAL                                           */}
                {/* ============================================================== */}
                <AnimatePresence>
                    {refundModalId && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRefundModalId(null)}></motion.div>
                            <motion.div initial={{ opacity: 0,scale: 0.95,y: 20 }} animate={{ opacity: 1,scale: 1,y: 0 }} exit={{ opacity: 0,scale: 0.95,y: 20 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                                <button onClick={() => setRefundModalId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                                <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center mb-6">
                                    <Banknote size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Process Refund?</h3>
                                <p className="text-gray-400 text-sm mb-8">Confirm that funds have been transferred back to the customer's card.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setRefundModalId(null)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                    <button onClick={handleProcessRefund} className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-colors">Yes,Process</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}