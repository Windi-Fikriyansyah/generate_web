"use client";

import { useState, useEffect, useCallback } from "react";
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
    ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

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
    const [processingIds, setProcessingIds] = useState<number[]>([]);
    const [compareProgress, setCompareProgress] = useState({ done: 0, total: 0 });
    const [isComparing, setIsComparing] = useState(false);
    const [activePolls, setActivePolls] = useState<Set<string>>(new Set());

    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/products`, {
                params: { page, limit, search, sort_by: sortBy, sort_order: sortOrder }
            });
            setProducts(res.data.data);
            setTotal(res.data.total);
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, search, sortBy, sortOrder]);

    // Load preference
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

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
        localStorage.setItem("table_limit", newLimit.toString());
        setPage(1); // Reset to first page when limit changes
    };

    // Selection logic
    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map(p => p.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) return;

        try {
            await axios.post(`${API_BASE}/products/bulk-delete`, selectedIds);
            setSelectedIds([]);
            toast.success("Data berhasil dihapus!");
            fetchProducts();
        } catch (err) {
            toast.error("Gagal menghapus data");
        }
    };

    const startPolling = useCallback(async (ids: number[]) => {
        if (ids.length === 0) return;

        const pollId = Math.random().toString(36).substring(7);
        setActivePolls(prev => new Set(prev).add(pollId));
        setIsComparing(true);

        // Initial setup for this specific batch
        let batchDone = 0;
        let batchTotal = ids.length;

        const pollInterval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE}/products/check-progress`, {
                    params: { ids: ids.join(",") }
                });

                batchDone = res.data.done;
                batchTotal = res.data.total;

                // Update global progress (simplified for now: just show the latest active one)
                setCompareProgress({ done: batchDone, total: batchTotal });

                if (res.data.is_finished) {
                    clearInterval(pollInterval);
                    setActivePolls(prev => {
                        const next = new Set(prev);
                        next.delete(pollId);
                        if (next.size === 0) setIsComparing(false);
                        return next;
                    });
                    toast.success("Komparasi selesai!");
                    fetchProducts();
                }
            } catch (err) {
                console.error("Polling error", err);
                clearInterval(pollInterval);
                setActivePolls(prev => {
                    const next = new Set(prev);
                    next.delete(pollId);
                    if (next.size === 0) setIsComparing(false);
                    return next;
                });
            }
        }, 2000);
    }, [fetchProducts]);

    const handleBulkCompare = async () => {
        const idsToCompare = selectedIds.length > 0 ? selectedIds : products.filter(p => p.image_upload).map(p => p.id);
        if (idsToCompare.length === 0) return;

        try {
            await axios.post(`${API_BASE}/products/compare`, idsToCompare);
            startPolling(idsToCompare);
        } catch (err) {
            toast.error("Gagal memproses komparasi");
        }
    };

    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;

        // Validation: Check if all selected have image_upload
        const missing = products.filter(p => selectedIds.includes(p.id) && !p.image_upload);
        if (missing.length > 0) {
            toast.error("Gagal Unduh! Beberapa item belum memiliki Gambar Upload.");
            return;
        }

        try {
            const response = await axios.post(`${API_BASE}/products/download-zip`, selectedIds, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `images_export_${Date.now()}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Download berhasil dimulai!");
        } catch (err) {
            toast.error("Gagal mengunduh file");
        }
    };

    // Upload Logic
    const handleFileUpload = async (productId: number, file: File) => {
        setUploadingId(productId);
        setIsUploadModalOpen(true);

        const CHUNK_SIZE = 1 * 1024 * 1024; // Lower chunk size for smoother progress
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileUuid = Math.random().toString(36).substring(7);
        let lastResponseIds: number[] = [];

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(file.size, start + CHUNK_SIZE);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append("file", chunk);
            formData.append("chunkIndex", i.toString());
            formData.append("totalChunks", totalChunks.toString());
            formData.append("fileName", file.name);
            formData.append("fileUuid", fileUuid);
            formData.append("product_id", productId.toString());
            formData.append("sync_by", syncBy);

            const response = await axios.post(`${API_BASE}/upload-chunk`, formData);

            const p = Math.round(((i + 1) / totalChunks) * 100);
            setUploadProgress(p);
            setUploadInfo({
                current: Number((end / (1024 * 1024)).toFixed(1)),
                total: Number((file.size / (1024 * 1024)).toFixed(1))
            });

            // If final chunk
            if (i === totalChunks - 1 && response.data.ids) {
                lastResponseIds = response.data.ids;
                // Start polling in background
                startPolling(response.data.ids);
            }
        }


        setUploadingId(null);
        setIsUploadModalOpen(false);
        toast.success("Gambar berhasil diunggah! Komparasi berjalan di background.");

        // Optimistic UI Update: Show the image immediately using Blob URL
        const blobUrl = URL.createObjectURL(file);

        setProducts(prev => prev.map(p => {
            // Check if this product should be updated (same ID or part of synced group)
            let shouldUpdate = false;

            // Primary match
            if (p.id === productId) shouldUpdate = true;

            // Sync match
            if (lastResponseIds && lastResponseIds.includes(p.id)) shouldUpdate = true;

            // Manual sync fallback if response.data.ids is empty for some reason
            if (syncBy === "nomor_id") {
                const target = prev.find(item => item.id === productId);
                if (target && target.nomor_id && p.nomor_id === target.nomor_id) shouldUpdate = true;
            } else if (syncBy === "sku_platform") {
                const target = prev.find(item => item.id === productId);
                if (target && target.sku_platform && p.sku_platform === target.sku_platform) shouldUpdate = true;
            }

            if (shouldUpdate) {
                return {
                    ...p,
                    image_upload: blobUrl,
                    // Reset processed images as they are being re-processed
                    final_image: null,
                    preview_image: null
                };
            }
            return p;
        }));

        // Do NOT call fetchProducts() immediately, as it would revert the optimistic update 
        // before the server processing is done. 
        // Rely on startPolling -> finish -> fetchProducts

    };

    // Import Logic
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setIsLoading(true);
        try {
            await axios.post(`${API_BASE}/products/import`, formData);
            toast.success("Excel berhasil diimpor!");
            fetchProducts();
        } catch (err) {
            toast.error("Gagal mengimpor Excel");
        } finally {
            setIsLoading(false);
        }
    };

    // Sorting Handler
    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc"); // Default to asc for new column
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return <span className="text-slate-300 ml-1">⇅</span>;
        return (
            <span className="text-purple-600 ml-1">
                {sortOrder === "asc" ? "↑" : "↓"}
            </span>
        );
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
            {/* Header section with Stats or Breadcrumbs */}
            <div className="flex-none flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
                <div className="space-y-1">
                    {/* Titles removed to focus on buttons */}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Sync Mode Toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                        <button
                            onClick={() => setSyncBy("nomor_id")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${syncBy === "nomor_id" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            SYNC ID SKU
                        </button>
                        <button
                            onClick={() => setSyncBy("sku_platform")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${syncBy === "sku_platform" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            SYNC SKU PLATFORM
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    <label className="bg-white hover:bg-slate-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm">
                        <Upload className="w-3.5 h-3.5" /> Import Excel
                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} />
                    </label>

                </div>
            </div>

            {/* Bulk Actions Floating Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 right-10 bg-slate-900 text-white px-10 py-6 rounded-[2rem] shadow-2xl z-[100] flex items-center gap-8 border border-white/10 backdrop-blur-xl"
                    >
                        <div className="flex flex-col border-r border-white/10 pr-8">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selection</span>
                            <span className="text-xl font-black">{selectedIds.length} <span className="text-sm font-bold text-slate-400 ml-1">Items</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleBulkDownload} className="flex items-center gap-2 hover:bg-emerald-600/20 text-emerald-400 px-5 py-3 rounded-xl transition-all font-black text-sm uppercase tracking-wider">
                                <Download className="w-5 h-5" /> Download
                            </button>
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:bg-red-600/20 text-red-400 px-5 py-3 rounded-xl transition-all font-black text-sm uppercase tracking-wider">
                                <Trash2 className="w-5 h-5" /> Delete
                            </button>
                        </div>
                        <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-white/10 rounded-full transition-all">
                            <X size={24} className="text-slate-400" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Data Management Card - Flexible Container */}
            <div className="flex-1 bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col min-h-0">
                {/* Search & Filter Bar - Fixed Top */}
                <div className="flex-none p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:ring-4 focus:ring-purple-600/5 focus:border-purple-600/40 transition-all font-medium shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show</span>
                            <select
                                value={limit}
                                onChange={(e) => handleLimitChange(Number(e.target.value))}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black outline-none focus:border-purple-600 transition-all"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={300}>300</option>
                            </select>
                        </div>
                        <button onClick={fetchProducts} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all shadow-sm active:scale-95">
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                        <button onClick={handleBulkCompare} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-2">
                            {isComparing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Compare"}
                        </button>
                    </div>
                </div>

                {/* Table Container - Scrollable Area */}
                <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                <span className="font-black text-slate-900 uppercase tracking-widest text-xs">Syncing Data...</span>
                            </div>
                        </div>
                    )}

                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead className="sticky top-0 z-40 bg-white shadow-sm ring-1 ring-black/5">
                            <tr className="text-slate-400 uppercase text-[10px] font-black tracking-[0.1em]">
                                <th className="px-6 py-4 w-12 text-center bg-slate-50/90 backdrop-blur border-b border-slate-200">
                                    <input
                                        type="checkbox"
                                        onChange={toggleSelectAll}
                                        checked={selectedIds.length === products.length && products.length > 0}
                                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 transition-all"
                                    />
                                </th>
                                <th className="px-4 py-4 text-center bg-slate-50/90 backdrop-blur border-b border-slate-200">Gambar Produk</th>
                                <th className="px-4 py-4 text-center bg-slate-50/90 backdrop-blur border-b border-slate-200">Gambar Upload</th>

                                {[
                                    { id: 'sku_platform', label: 'SKU Platform' },
                                    { id: 'jumlah_barang', label: 'Jumlah', center: true },
                                    { id: 'no_pesanan', label: 'No. Pesanan' },
                                    { id: 'nomor_id', label: 'ID SKU' },
                                    { id: 'id_produk', label: 'ID Produk' },
                                ].map((col) => (
                                    <th
                                        key={col.id}
                                        className={`px-6 py-4 bg-slate-50/90 backdrop-blur border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none ${col.center ? 'text-center' : ''}`}
                                        onClick={() => handleSort(col.id)}
                                    >
                                        <div className={`flex items-center gap-1 ${col.center ? 'justify-center' : ''}`}>
                                            {col.label} <SortIcon column={col.id} />
                                        </div>
                                    </th>
                                ))}

                                <th className="px-6 py-4 text-center bg-purple-50/90 backdrop-blur border-b border-purple-100/50">Hasil Compare</th>
                                <th className="px-6 py-4 text-right bg-slate-50/90 backdrop-blur border-b border-slate-200">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {products.map((product) => {
                                const isSelected = selectedIds.includes(product.id);
                                const isMissingUpload = !product.image_upload && isSelected;
                                return (
                                    <tr
                                        key={product.id}
                                        className={`group hover:bg-slate-50/80 transition-all ${isSelected ? "bg-purple-50/30" : "bg-white"} ${isMissingUpload ? "bg-red-50 border-y-2 border-red-500" : ""}`}
                                    >
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
                            })}
                        </tbody>
                    </table>

                    {products.length === 0 && !isLoading && (
                        <div className="py-20 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                <Search size={32} className="text-slate-200" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">No results found</h3>
                            <p className="text-slate-400 font-bold text-xs">Try adjusting your filters</p>
                        </div>
                    )}
                </div>

                {/* Pagination Footer - Fixed Bottom of Card */}
                <div className="flex-none p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-4">
                        <span>Showing <span className="text-slate-900">{(page - 1) * limit + 1}</span> - <span className="text-slate-900">{Math.min(page * limit, total)}</span> of <span className="text-slate-900">{total}</span></span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-purple-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(Math.ceil(total / limit))].map((_, i) => {
                                const p = i + 1;
                                if (p === 1 || p === Math.ceil(total / limit) || (p >= page - 1 && p <= page + 1)) {
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${page === p ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm"}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                } else if (p === page - 2 || p === page + 2) {
                                    return <span key={p} className="text-slate-300 font-black px-1 text-xs">...</span>;
                                }
                                return null;
                            })}
                        </div>
                        <button
                            disabled={page >= Math.ceil(total / limit)}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-purple-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>


            {/* Upload Modal Overlay */}
            <AnimatePresence>
                {isUploadModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-8"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600"
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <div className="text-center space-y-6">
                                <div className="w-24 h-24 bg-purple-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-purple-100">
                                    <CloudUpload size={48} className="text-purple-600 animate-bounce" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Processing File</h3>
                                    <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Optimizing for HD Comparison</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between font-black text-xs uppercase tracking-widest px-2">
                                        <span className="text-purple-600">{uploadProgress}% Complete</span>
                                        <span className="text-slate-400">{uploadInfo.current} / {uploadInfo.total} MB</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                                            animate={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>

                                <p className="text-slate-400 text-sm font-medium italic">Please stay on this page. We are securely processing your high-resolution assets.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Missing icons for the redesigned page
function CloudUpload(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
        </svg>
    )
}

function X(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    )
}
