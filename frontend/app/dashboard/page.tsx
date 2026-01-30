"use client";

import { motion } from "framer-motion";
import {
    Users,
    Images as MediaIcon,
    Clock,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    Zap,
    Trophy
} from "lucide-react";

export default function DashboardPage() {
    const stats = [
        { label: "Total Comparison", value: "1,284", icon: MediaIcon, color: "blue", trend: "+12%" },
        { label: "Active Users", value: "342", icon: Users, color: "indigo", trend: "+5%" },
        { label: "Success Rate", value: "99.2%", icon: CheckCircle2, color: "emerald", trend: "+0.4%" },
        { label: "Processing Speed", value: "1.2s", icon: Zap, color: "amber", trend: "-0.1s" },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">System Overview</h1>
                <p className="text-slate-400 font-medium">Monitoring the health and performance of your image processing engine.</p>
            </header>

            {/* Stats Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
            >
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        variants={item}
                        className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all hover:translate-y-[-4px]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 shadow-lg shadow-${stat.color}-500/5`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Action Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 relative overflow-hidden group shadow-2xl shadow-blue-500/20"
                >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="bg-white/20 backdrop-blur-md w-max px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider mb-6">
                                Ready to Process
                            </div>
                            <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                                Transform Your Images <br />With AI Precision.
                            </h2>
                            <p className="text-blue-100 max-w-md mb-8 text-lg font-medium leading-relaxed">
                                Upload and compare images instantly using our high-speed processing engine.
                            </p>
                        </div>
                        <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 w-max shadow-xl">
                            <MediaIcon className="w-6 h-6" />
                            Go to Compare tool
                        </button>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[100%] bg-white/10 rounded-full blur-[100px] animate-pulse" />
                    <MediaIcon className="absolute bottom-[-40px] right-[-40px] w-80 h-80 text-white/5 transform rotate-[-15deg] group-hover:rotate-0 transition-transform duration-700" />
                </motion.div>

                {/* Performance Chart Placeholder/Summary */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0f172a] border border-white/5 rounded-3xl p-8 flex flex-col justify-between"
                >
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-white">System Health</h3>
                            <ArrowUpRight className="text-slate-500 w-5 h-5" />
                        </div>
                        <p className="text-slate-400 text-sm">Real-time engine utilization.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-[#1e293b] rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                <Clock className="text-orange-500 w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-white">CPU Usage</span>
                                    <span className="text-xs text-slate-400">45%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full w-[45%]" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1e293b] rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                <Zap className="text-purple-500 w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-white">GPU Load</span>
                                    <span className="text-xs text-slate-400">12%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full w-[12%]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Trophy className="text-emerald-500 w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Optimized State</p>
                            <p className="text-xs text-slate-500">Peak performance detected.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
