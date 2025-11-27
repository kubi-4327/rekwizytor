'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Step {
    id: number
    label: string
}

interface StepperProps {
    steps: Step[]
    currentStep: number
    onStepClick?: (step: number) => void
    className?: string
    color?: string | null
}

export function Stepper({ steps, currentStep, onStepClick, className, color }: StepperProps) {
    const activeColor = color || '#3b82f6'
    return (
        <div className={cn("flex items-center justify-center gap-4", className)}>
            {steps.map((step, idx) => {
                const isCompleted = currentStep > step.id
                const isActive = currentStep === step.id
                const isFuture = currentStep < step.id

                return (
                    <div key={step.id} className="flex items-center gap-4">
                        <div
                            className={cn(
                                "flex items-center gap-3 transition-colors duration-300",
                                isFuture ? "text-neutral-600" : "text-white",
                                onStepClick && isCompleted ? "cursor-pointer hover:text-neutral-300" : ""
                            )}
                            onClick={() => {
                                if (onStepClick && isCompleted) {
                                    onStepClick(step.id)
                                }
                            }}
                        >
                            <div className="relative">
                                <motion.div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 relative bg-neutral-950",
                                        isActive ? "text-white" :
                                            isCompleted ? "text-white" : "border-neutral-800"
                                    )}
                                    style={{
                                        borderColor: isActive || isCompleted ? activeColor : '#262626',
                                        backgroundColor: isCompleted ? activeColor : '#0a0a0a',
                                    }}
                                    initial={false}
                                    animate={{
                                        borderColor: isActive || isCompleted ? activeColor : '#262626',
                                        backgroundColor: isCompleted ? activeColor : '#0a0a0a',
                                    }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {isCompleted ? (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Check className="w-5 h-5" />
                                        </motion.div>
                                    ) : (
                                        <span className="font-medium">{step.id}</span>
                                    )}
                                </motion.div>

                                {isActive && (
                                    <motion.div
                                        layoutId="stepper-glow"
                                        className="absolute inset-0 rounded-full blur-md"
                                        style={{ backgroundColor: `${activeColor}33` }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                )}
                            </div>
                            <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                        </div>

                        {idx < steps.length - 1 && (
                            <div className="w-12 h-0.5 relative bg-neutral-800 overflow-hidden rounded-full">
                                <motion.div
                                    className="absolute inset-0"
                                    style={{ backgroundColor: activeColor }}
                                    initial={{ x: '-100%' }}
                                    animate={{
                                        x: isCompleted ? '0%' : '-100%'
                                    }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
