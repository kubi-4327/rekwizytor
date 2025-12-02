'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import LightRays from '@/components/ui/LightRays'

export default function LoginPage() {
    const t = useTranslations('Login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [isSignUp, setIsSignUp] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const getPasswordStrength = (pass: string) => {
        if (!pass) return 0
        let score = 0
        if (pass.length >= 8) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1
        return score
    }

    const passwordStrength = getPasswordStrength(password)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        if (isSignUp) {
            if (passwordStrength < 2) {
                setError(t('passwordTooWeak'))
                setLoading(false)
                return
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                    data: {
                        full_name: name.trim(),
                    },
                },
            })
            if (error) {
                setError(error.message)
            } else {
                setMessage(t('checkEmail'))
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) {
                setError(error.message)
            } else {
                router.push('/')
                router.refresh()
            }
        }
        setLoading(false)
    }

    const fillTestData = () => {
        setEmail('inspector@theater.com')
        setPassword('password123')
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-200 relative overflow-hidden">
            <LightRays
                raysOrigin="top-center"
                raysColor="#cfcfcf"
                raysSpeed={0.2}
                lightSpread={2.0}
                rayLength={1.0}
                followMouse={true}
                mouseInfluence={0.1}
                noiseAmount={0.1}
                distortion={0}
                className="opacity-40"
            />

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-8 relative h-32 w-80">
                        <Image
                            src="/logo-full-sub.png"
                            alt="Rekwizytor"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <p className="mt-2 text-sm text-neutral-400">
                        {isSignUp ? t('subtitleSignUp') : t('subtitleSignIn')}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-4">
                        {isSignUp && (
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium text-neutral-300"
                                >
                                    {t('name')}
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-neutral-300"
                            >
                                {t('email')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                                placeholder="inspector@theater.com"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-neutral-300"
                            >
                                {t('password')}
                            </label>
                            <div className="flex justify-end">
                                <a href="/forgot-password" className="text-xs text-neutral-400 hover:text-white transition-colors">
                                    {t('forgotPassword')}
                                </a>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                            />
                            {isSignUp && password && (
                                <div className="mt-2 flex gap-1">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= level
                                                ? passwordStrength >= 3
                                                    ? 'bg-green-500'
                                                    : passwordStrength >= 2
                                                        ? 'bg-yellow-500'
                                                        : 'bg-red-500'
                                                : 'bg-neutral-800'
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/50 backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="rounded-md bg-green-900/20 p-3 text-sm text-green-400 border border-green-900/50 backdrop-blur-sm">
                            {message}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-white/5"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                isSignUp ? t('signUp') : t('signIn')
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={fillTestData}
                            className="flex w-full items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900 cursor-pointer"
                        >
                            <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                            {t('fillTestCredentials')}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp)
                            setError(null)
                            setMessage(null)
                        }}
                        className="text-sm text-neutral-400 hover:text-white underline underline-offset-4 cursor-pointer"
                    >
                        {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}
                    </button>
                </div>
            </div>
        </div>
    )
}
