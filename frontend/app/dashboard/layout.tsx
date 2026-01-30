"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Images,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    Bell,
    Search,
    ChevronRight,
    SearchIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const router = useRouter();
    const pathname = usePathname();

    const menuItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/compare" },
    ];

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        } else {
            // Fetch user data
            fetch(`${API_BASE}/users/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch user");
                    return res.json();
                })
                .then(data => setUserData(data))
                .catch(() => {
                    localStorage.removeItem("token");
                    router.push("/login");
                });
        }
    }, [router, API_BASE]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 0 }}
                className={`${isSidebarOpen ? "p-6" : "p-0"} bg-white border-r border-slate-200 flex flex-col z-50 h-screen transition-all shadow-xl shadow-slate-200/50 overflow-hidden shrink-0`}
            >
                <div className="flex items-center gap-3 mb-10 overflow-hidden whitespace-nowrap">
                    <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20">
                        <Images className="text-white w-6 h-6" />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tight">
                        Vision<span className="text-purple-600">Compare</span>
                    </span>
                </div>

                <nav className="flex-1 space-y-2 overflow-hidden">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path || (pathname === "/dashboard" && item.path === "/dashboard/compare");
                        return (
                            <button
                                key={item.label}
                                onClick={() => router.push(item.path)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group whitespace-nowrap ${isActive
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                                    : "hover:bg-purple-50 text-slate-500 hover:text-purple-600"
                                    }`}
                            >
                                <item.icon className={`w-6 h-6 shrink-0 ${isActive ? "text-white" : "group-hover:text-purple-600"}`} />
                                <span className="font-bold text-sm">{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <div className="pt-6 border-t border-slate-100 overflow-hidden">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all font-bold whitespace-nowrap"
                    >
                        <LogOut className="w-6 h-6 shrink-0" />
                        <span className="text-sm">Logout</span>
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 z-40 shrink-0">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-3 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors bg-slate-50 border border-slate-200"
                        >
                            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <div className="relative hidden lg:block w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search inventory or orders..."
                                className="w-full bg-slate-100/50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <button className="relative p-3 hover:bg-slate-100 rounded-xl text-slate-400 bg-slate-50 border border-slate-200 transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-purple-600 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-10 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-slate-900 leading-none mb-1">{userData?.email?.split('@')[0] || "Administrator"}</p>
                                <p className="text-[10px] text-purple-600 uppercase tracking-widest font-black">Pro Member</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-[1rem] flex items-center justify-center shadow-lg shadow-purple-600/20 text-white font-black text-lg">
                                {userData?.email?.[0].toUpperCase() || "A"}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#f8fafc]">
                    {children}
                </div>
            </main>
        </div>
    );
}
