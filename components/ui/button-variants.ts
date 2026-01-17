import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const variants = {
    variant: {
        primary: "bg-linear-to-br from-burgundy-light to-burgundy-main text-white shadow-md hover:from-[#D43A49] hover:to-[#B02735] border border-transparent",
        secondary: "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white border border-transparent",
        outline: "bg-transparent border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white",
        ghost: "bg-transparent text-neutral-400 hover:text-white hover:bg-white/5",
        destructive: "bg-red-900/50 text-red-200 hover:bg-red-900/80 hover:text-red-100 border border-red-900/50",
        link: "text-burgundy-light underline-offset-4 hover:underline",
        glassy: "bg-white/10 border border-white/10 backdrop-blur-sm text-neutral-300 hover:bg-white/20 hover:text-white rounded-xl shadow-lg shadow-black/20",
        "glassy-primary": "bg-burgundy-main/60 border border-burgundy-main/50 backdrop-blur-sm text-white hover:bg-burgundy-main/80 rounded-xl shadow-lg shadow-burgundy-main/20",
        "glassy-danger": "bg-red-900/60 border border-red-500/30 backdrop-blur-sm text-red-100 hover:bg-red-900/80 hover:text-white rounded-xl shadow-lg shadow-red-900/20",
        "glassy-secondary": "bg-neutral-800/60 border border-neutral-700/50 backdrop-blur-sm text-neutral-200 hover:bg-neutral-800/80 hover:text-white rounded-xl shadow-sm",
        "glassy-success": "bg-emerald-600/20 border border-emerald-600/30 backdrop-blur-sm text-emerald-100 hover:bg-emerald-600/40 hover:text-white rounded-xl shadow-lg shadow-emerald-900/10",
    },
    size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9 p-0 flex items-center justify-center",
    },
}

export const buttonVariants = ({
    variant = "primary",
    size = "md",
    className = ""
}: {
    variant?: keyof typeof variants.variant
    size?: keyof typeof variants.size
    className?: string
} = {}) => {
    return cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-burgundy-light disabled:pointer-events-none disabled:opacity-50",
        variants.variant[variant],
        variants.size[size],
        className
    )
}

export { variants }
