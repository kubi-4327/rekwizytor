"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { buttonVariants, variants } from "./button-variants"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof variants.variant
    size?: keyof typeof variants.size
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

export { buttonVariants }


const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

        return (
            <button
                className={buttonVariants({ variant, size, className })}
                ref={ref}
                disabled={isLoading || disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
