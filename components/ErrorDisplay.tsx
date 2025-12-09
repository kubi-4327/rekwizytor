'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface ErrorDisplayProps {
    error: Error | null
    reset: () => void
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, reset }) => {
    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center p-4">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-burgundy-main/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-75" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 max-w-lg w-full"
            >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    {/* Glass Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">

                        {/* Icon Container */}
                        <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                                delay: 0.1
                            }}
                            className="w-20 h-20 bg-gradient-to-br from-burgundy-main to-burgundy-dark rounded-2xl flex items-center justify-center shadow-lg shadow-burgundy-main/25 ring-4 ring-white/5"
                        >
                            <AlertTriangle className="w-10 h-10 text-white" strokeWidth={1.5} />
                        </motion.div>

                        {/* Text Content */}
                        <div className="space-y-2">
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-bold text-white tracking-tight"
                            >
                                Coś poszło nie tak
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-gray-400 text-sm font-medium uppercase tracking-wider"
                            >
                                Something went wrong
                            </motion.p>
                        </div>

                        {/* Error Message Box */}
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ delay: 0.4 }}
                            className="w-full bg-black/20 border border-white/5 rounded-xl p-4 overflow-hidden"
                        >
                            <p className="text-red-400/90 text-sm font-mono break-words leading-relaxed">
                                {error?.message || 'Wystąpił nieoczekiwany błąd systemu. / An unexpected system error occurred.'}
                            </p>
                        </motion.div>

                        {/* Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col sm:flex-row gap-3 w-full pt-4"
                        >
                            <Button
                                onClick={reset}
                                className="flex-1 bg-white text-black hover:bg-gray-100 hover:scale-[1.02] transition-all font-semibold h-12"
                                leftIcon={<RefreshCw className="w-4 h-4" />}
                            >
                                Spróbuj ponownie
                            </Button>

                            <Link href="/" className="flex-1">
                                <Button
                                    variant="outline"
                                    className="w-full border-white/10 text-white hover:bg-white/5 hover:border-white/20 h-12"
                                    leftIcon={<Home className="w-4 h-4" />}
                                >
                                    Strona główna
                                </Button>
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="pt-4 border-t border-white/5 w-full"
                        >
                            <p className="text-xs text-gray-500">
                                Error Code: {generateErrorCode(error)}
                            </p>
                        </motion.div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="text-center mt-8 space-y-1"
                >
                    <p className="text-gray-600 text-xs">
                        Jeśli problem się powtarza, skontaktuj się z administratorem.
                    </p>
                    <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                        Rekwizytorium System
                    </p>
                </motion.div>
            </motion.div>
        </div>
    )
}

// Helper to generate a consistent hash from error string for reference
function generateErrorCode(error: Error | null): string {
    if (!error || !error.message) return 'UNKNOWN';
    let hash = 0;
    const str = error.message;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `ERR-${Math.abs(hash).toString(16).toUpperCase().substring(0, 8)}`;
}
