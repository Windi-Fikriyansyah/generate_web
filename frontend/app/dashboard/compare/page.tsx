"use client";

import { useState, useEffect, useCallback, memo } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
    Upload,
    CheckCircle,
    AlertCircle,
    RefreshCcw,
    Download,
    Eye,
    Trash2,
    Image as ImageIcon,
    Plus,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
    MoreHorizontal,
    ExternalLink,
    X,
    UploadCloud
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

// Memoized Table Row Component to prevent full table re-renders
const ProductRow = memo(({ product, isSelected, toggleSelectOne, handleFileUpload, API_BASE }: any) => {
    return (
        <tr className={`group hover:bg-slate-50/80 transition-all ${isSelected ? "bg-purple-50/50" : ""}`}>
            <td className="px-6 py-4 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectOne(product.id)}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 transition-all"
                />
            </td>
            <td className="px-4 py-4 text-center">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-100 p-1 group-hover:scale-105 transition-transform mx-auto">
                    {product.sku_gambar ? (
                        <img src={product.sku_gambar} className="w-full h-full object-cover rounded-lg" loading="lazy" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg text-slate-300"><ImageIcon size={20} /></div>
                    )}
                </div>
            </td>
            <td className="px-4 py-4 text-center">
                <div
                    className="w-16 h-16 rounded-xl bg-white border border-slate-100 p-1 group-hover:shadow-md transition-all mx-auto relative overflow-hidden"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-purple-500', 'ring-2', 'ring-purple-200');
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-purple-500', 'ring-2', 'ring-purple-200');
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-purple-500', 'ring-2', 'ring-purple-200');
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileUpload(product.id, e.dataTransfer.files[0]);
                        }
                    }}
                >
                    {product.image_upload ? (
                        <img
                            src={product.image_upload.startsWith('blob:') ? product.image_upload : `${API_BASE}/${product.image_upload}`}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                        />
                    ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center bg-slate-50 hover:bg-purple-50 rounded-lg text-slate-300 hover:text-purple-600 cursor-pointer transition-colors border-2 border-dashed border-slate-100 uppercase text-[6px] font-black pointer-events-none">
                            <Plus size={16} className="mb-0.5" /> Add
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileUpload(product.id, e.target.files[0])} />
                        </label>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider">{product.sku_platform}</span>
            </td>
            <td className="px-6 py-4 text-center">
                <span className="text-xs font-black text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-100">{product.jumlah_barang}</span>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-900">#{product.no_pesanan}</span>
                    <span className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">{product.spesifikasi_produk || "-"}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className="text-xs font-black text-slate-700 font-mono">{product.nomor_id}</span>
            </td>
            <td className="px-6 py-4">
                <span className="text-xs font-black text-slate-500 font-mono">{product.id_produk || "-"}</span>
            </td>
            <td className="px-6 py-4 text-center bg-purple-50/30">
                {product.preview_image ? (
                    <a
                        href={`${API_BASE}/${product.final_image}`}
                        target="_blank"
                        className="inline-block relative group/preview"
                    >
                        <div className="w-16 h-16 rounded-xl p-1 bg-white border border-purple-200 shadow-sm group-hover/preview:shadow-purple-600/10 transition-all">
                            <img src={`${API_BASE}/${product.preview_image}`} className="w-full h-full object-cover rounded-lg" loading="lazy" />
                            <div className="absolute inset-0 bg-purple-900/40 rounded-xl opacity-0 group-hover/preview:opacity-100 transition-all flex items-center justify-center">
                                <ExternalLink size={16} className="text-white scale-75 group-hover/preview:scale-100 transition-transform" />
                            </div>
                        </div>
                    </a>
                ) : product.image_upload ? (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center text-purple-600 mx-auto bg-purple-50 animate-pulse">
                        <Loader2 size={24} className="animate-spin mb-1" />
                        <span className="text-[6px] font-black uppercase">Comparing</span>
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-purple-100 flex items-center justify-center text-purple-100 mx-auto bg-white/50">
                        <ImageIcon size={24} />
                    </div>
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 transition-all opacity-0 group-hover:opacity-100">
                    <label className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg cursor-pointer transition-all shadow-lg shadow-blue-600/20">
                        <Upload size={14} />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileUpload(product.id, e.target.files[0])} />
                    </label>
                </div>
            </td>
        </tr>
    );
});
ProductRow.displayName = "ProductRow";

export default function ComparePage() {
    const [products, setProducts] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isLimitLoaded, setIsLimitLoaded] = useState(false);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [syncBy, setSyncBy] = useState<"nomor_id" | "sku_platform">("nomor_id");

    // Upload state
    const [uploadingId, setUploadingId] = useState<number | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadInfo, setUploadInfo] = useState({ current: 0, total: 0 });
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Compare state
    const [compareProgress, setCompareProgress] = useState({ done: 0, total: 0 });
    const [isComparing, setIsComparing] = useState(false);
    const [activePolls, setActivePolls] = useState<Set<string>>(new Set());

    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/products`, {
                params: { page, limit, search, sort_by: sortBy, sort_order: sortOrder }
            });
            // Revoke old blob URLs if they exist in current view
            products.forEach(p => {
                if (p.image_upload?.startsWith('blob:')) {
                    URL.revokeObjectURL(p.image_upload);
                }
            });
            setProducts(res.data.data);
            setTotal(res.data.total);
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, search, sortBy, sortOrder]);

    // Load initial preference
    useEffect(() => {
        const savedLimit = localStorage.getItem("table_limit");
        if (savedLimit) {
            setLimit(Number(savedLimit));
        }
        setIsLimitLoaded(true);
    }, []);

    useEffect(() => {
        if (isLimitLoaded) {
            fetchProducts();
        }
    }, [fetchProducts, isLimitLoaded]);

    // Single Smart Polling Effect to keep UI in sync during processing
    useEffect(() => {
        const hasPending = products.some(p => p.image_upload && !p.final_image);
        if (!hasPending) return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE}/products`, {
                    params: { page, limit, search, sort_by: sortBy, sort_order: sortOrder }
                });

                // Deep comparison to avoid unnecessary re-renders
                if (JSON.stringify(res.data.data) !== JSON.stringify(products)) {
                    setProducts(res.data.data);
                    setTotal(res.data.total);
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [products, page, limit, search, sortBy, sortOrder]);

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
        localStorage.setItem("table_limit", newLimit.toString());
        setPage(1);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map(p => p.id));
        }
    };

    const toggleSelectOne = useCallback((id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Hapus ${selectedIds.length} item pilihan?`)) return;

        try {
            await axios.post(`${API_BASE}/products/bulk-delete`, selectedIds);
            setSelectedIds([]);
            toast.success("Data berhasil dihapus!");
            fetchProducts();
        } catch (err) {
            toast.error("Gagal menghapus data");
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Hapus SEMUA data produk? Tindakan ini permanen.")) return;

        setIsLoading(true);
        try {
            await axios.post(`${API_BASE}/products/delete-all`);
            setSelectedIds([]);
            toast.success("Semua data berhasil dibersihkan!");
            fetchProducts();
        } catch (err) {
            toast.error("Gagal membersihkan data");
        } finally {
            setIsLoading(false);
        }
    };

    const startPolling = useCallback(async (batchId?: string) => {
        if (!batchId) return;
        setActivePolls(prev => new Set(prev).add(batchId));
        setIsComparing(true);
        localStorage.setItem("active_batch_id", batchId);

        const pollInterval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE}/products/check-progress`, {
                    params: { batch_id: batchId }
                });

                const { done, total, is_finished } = res.data;
                setCompareProgress({ done, total });

                if (is_finished) {
                    clearInterval(pollInterval);
                    localStorage.removeItem("active_batch_id");
                    setActivePolls(prev => {
                        const next = new Set(prev);
                        next.delete(batchId);
                        if (next.size === 0) setIsComparing(false);
                        return next;
                    });
                    toast.success("Komparasi selesai!");
                    fetchProducts();
                }
            } catch (err) {
                console.error("Batch polling error", err);
            }
        }, 5000); // Polling slower to reduce server load
    }, [fetchProducts]);

    useEffect(() => {
        const activeBatchId = localStorage.getItem("active_batch_id");
        if (activeBatchId) {
            startPolling(activeBatchId);
        }
    }, [startPolling]);

    const handleBulkCompare = async () => {
        try {
            if (selectedIds.length > 0) {
                const res = await axios.post(`${API_BASE}/products/compare`, selectedIds);
                startPolling(res.data.batch_id);
                toast.success("Memulai komparasi...");
            } else {
                const res = await axios.post(`${API_BASE}/products/compare-pending`);
                if (res.data.batch_id) {
                    startPolling(res.data.batch_id);
                    toast.success(`Memulai komparasi untuk ${res.data.count} data baru`);
                } else {
                    toast.error("Tidak ada data baru untuk dikomparasi");
                }
            }
        } catch (err) {
            toast.error("Gagal memproses komparasi");
        }
    };

    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;
        try {
            const response = await axios.post(`${API_BASE}/products/download-zip`, selectedIds, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `export_${Date.now()}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Download dimulai!");
        } catch (err) {
            toast.error("Gagal mengunduh file");
        }
    };

    const handleFileUpload = useCallback(async (productId: number, file: File) => {
        setUploadingId(productId);
        setIsUploadModalOpen(true);
        setUploadProgress(0);

        const CHUNK_SIZE = 20 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileUuid = Math.random().toString(36).substring(7);
        let lastResponseIds: number[] = [];

        const activeUploadChunks = 6;
        const chunks = Array.from({ length: totalChunks }, (_, i) => i);
        let completed = 0;

        const uploadTask = async (i: number) => {
            const start = i * CHUNK_SIZE;
            const chunk = file.slice(start, Math.min(file.size, start + CHUNK_SIZE));
            const formData = new FormData();
            formData.append("file", chunk);
            formData.append("chunkIndex", i.toString());
            formData.append("totalChunks", totalChunks.toString());
            formData.append("fileName", file.name);
            formData.append("fileUuid", fileUuid);
            formData.append("product_id", productId.toString());
            formData.append("sync_by", syncBy);

            const res = await axios.post(`${API_BASE}/upload-chunk`, formData);
            completed++;
            setUploadProgress(Math.round((completed / totalChunks) * 100));
            setUploadInfo({
                current: Number(((completed * CHUNK_SIZE) / (1024 * 1024)).toFixed(1)),
                total: Number((file.size / (1024 * 1024)).toFixed(1))
            });
            if (res.data.ids) lastResponseIds = res.data.ids;
        };

        try {
            const pool: any[] = [];
            for (const i of chunks) {
                const p = uploadTask(i);
                pool.push(p);
                if (pool.length >= activeUploadChunks) await Promise.race(pool);
            }
            await Promise.all(pool);

            setUploadingId(null);
            setIsUploadModalOpen(false);
            toast.success("Berhasil diunggah!");

            // Optimistic update
            const blobUrl = URL.createObjectURL(file);
            setProducts(current => current.map(p => {
                let match = (p.id === productId) || (lastResponseIds && lastResponseIds.includes(p.id));
                if (!match) {
                    const target = current.find(item => item.id === productId);
                    if (target) {
                        if (syncBy === "nomor_id" && p.nomor_id === target.nomor_id) match = true;
                        if (syncBy === "sku_platform" && p.sku_platform === target.sku_platform) match = true;
                    }
                }
                return match ? { ...p, image_upload: blobUrl, final_image: null, preview_image: null } : p;
            }));
        } catch (err) {
            setIsUploadModalOpen(false);
            setUploadingId(null);
            toast.error("Gagal mengunggah");
        }
    }, [syncBy]);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE}/products/import`, formData);
            toast.success("Import berhasil!");
            fetchProducts();
        } catch (err) {
            toast.error("Import gagal");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };

    const SortIcon = useCallback(({ column }: { column: string }) => {
        if (sortBy !== column) return <span className="text-slate-300 ml-1">⇅</span>;
        return <span className="text-purple-600 ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
    }, [sortBy, sortOrder]);

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex-none flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                        <button onClick={() => setSyncBy("nomor_id")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${syncBy === "nomor_id" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>SYNC ID SKU</button>
                        <button onClick={() => setSyncBy("sku_platform")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${syncBy === "sku_platform" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>SYNC SKU PLATFORM</button>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                    <button onClick={handleDeleteAll} className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"><Trash2 className="w-3.5 h-3.5" /> Delete All</button>
                    <label className="bg-white hover:bg-slate-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"><Upload className="w-3.5 h-3.5" /> Import Excel<input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} /></label>
                </div>
            </div>

            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 right-10 bg-slate-900 text-white px-10 py-6 rounded-[2rem] shadow-2xl z-[100] flex items-center gap-8 border border-white/10 backdrop-blur-xl">
                        <div className="flex flex-col border-r border-white/10 pr-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selection</span><span className="text-xl font-black">{selectedIds.length} <span className="text-sm font-bold text-slate-400 ml-1">Items</span></span></div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleBulkDownload} className="flex items-center gap-2 hover:bg-emerald-600/20 text-emerald-400 px-5 py-3 rounded-xl transition-all font-black text-sm uppercase tracking-wider"><Download className="w-5 h-5" /> Download</button>
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:bg-red-600/20 text-red-400 px-5 py-3 rounded-xl transition-all font-black text-sm uppercase tracking-wider"><Trash2 className="w-5 h-5" /> Delete</button>
                        </div>
                        <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} className="text-slate-400" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col min-h-0">
                <div className="flex-none p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchProducts()} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:ring-4 focus:ring-purple-600/5 focus:border-purple-600/40 transition-all font-medium shadow-sm" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show</span><select value={limit} onChange={(e) => handleLimitChange(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black outline-none focus:border-purple-600"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={300}>300</option></select></div>
                        <button onClick={fetchProducts} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm active:scale-95"><RefreshCcw className="w-4 h-4" /></button>
                        <button onClick={handleBulkCompare} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-2 relative overflow-hidden group">
                            {isComparing ? <><div className="absolute inset-0 bg-purple-800 transition-all duration-500" style={{ width: `${(compareProgress.done / (compareProgress.total || 1)) * 100}%` }}></div><span className="relative z-10 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {Math.round((compareProgress.done / (compareProgress.total || 1)) * 100)}%</span></> : "Compare"}
                        </button>
                    </div>
                </div>

                {isComparing && (
                    <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 flex items-center gap-4">
                        <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden"><motion.div className="h-full bg-purple-600" animate={{ width: `${(compareProgress.done / (compareProgress.total || 1)) * 100}%` }} /></div>
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest min-w-[100px] text-right">Comparing: {compareProgress.done} / {compareProgress.total}</span>
                    </div>
                )}

                <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                    {isLoading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center"><div className="flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-purple-600 animate-spin" /><span className="font-black text-slate-900 uppercase tracking-widest text-xs">Syncing Data...</span></div></div>}
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead className="sticky top-0 z-40 bg-white shadow-sm">
                            <tr className="text-slate-400 uppercase text-[10px] font-black tracking-[0.1em]">
                                <th className="px-6 py-4 w-12 text-center bg-slate-50/90 border-b"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === products.length && products.length > 0} className="w-4 h-4 rounded border-slate-300 text-purple-600" /></th>
                                <th className="px-4 py-4 text-center bg-slate-50/90 border-b">Gambar Produk</th>
                                <th className="px-4 py-4 text-center bg-slate-50/90 border-b">Gambar Upload</th>
                                {[{ id: 'sku_platform', label: 'SKU Platform' }, { id: 'jumlah_barang', label: 'Jumlah', center: true }, { id: 'no_pesanan', label: 'No. Pesanan' }, { id: 'nomor_id', label: 'ID SKU' }, { id: 'id_produk', label: 'ID Produk' }].map((col) => (
                                    <th key={col.id} className={`px-6 py-4 bg-slate-50/90 border-b cursor-pointer hover:bg-slate-100 ${col.center ? 'text-center' : ''}`} onClick={() => handleSort(col.id)}><div className={`flex items-center gap-1 ${col.center ? 'justify-center' : ''}`}>{col.label} <SortIcon column={col.id} /></div></th>
                                ))}
                                <th className="px-6 py-4 text-center bg-purple-50/90 border-b">Hasil Compare</th>
                                <th className="px-6 py-4 text-right bg-slate-50/90 border-b">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {products.map((product) => (
                                <ProductRow
                                    key={product.id}
                                    product={product}
                                    isSelected={selectedIds.includes(product.id)}
                                    toggleSelectOne={toggleSelectOne}
                                    handleFileUpload={handleFileUpload}
                                    API_BASE={API_BASE}
                                />
                            ))}
                        </tbody>
                    </table>
                    {products.length === 0 && !isLoading && <div className="py-20 flex flex-col items-center text-center"><Search size={32} className="text-slate-200 mb-4" /><h3 className="text-lg font-black text-slate-900 mb-1">No results found</h3></div>}
                </div>

                <div className="flex-none p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Showing {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} of {total}</p>
                    <div className="flex items-center gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
                        <div className="flex items-center gap-1">
                            {[...Array(Math.ceil(total / limit))].map((_, i) => (i + 1 === 1 || i + 1 === Math.ceil(total / limit) || (i + 1 >= page - 1 && i + 1 <= page + 1)) ? <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-[10px] font-black ${page === i + 1 ? "bg-purple-600 text-white" : "bg-white border text-slate-500"}`}>{i + 1}</button> : (i + 1 === page - 2 || i + 1 === page + 2) ? <span key={i} className="text-slate-300">...</span> : null)}
                        </div>
                        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isUploadModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-8">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-slate-100"><motion.div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} /></div>
                            <div className="text-center space-y-6">
                                <div className="w-24 h-24 bg-purple-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-purple-100"><UploadCloud size={48} className="text-purple-600 animate-bounce" /></div>
                                <div className="space-y-2"><h3 className="text-3xl font-black text-slate-900 tracking-tight">Uploading...</h3><p className="text-slate-500 font-bold uppercase text-[10px]">{uploadProgress}% Complete</p></div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{uploadInfo.current}MB / {uploadInfo.total}MB</div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
