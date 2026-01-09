import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Optional label text displayed above the input */
    label?: string;
    /** Optional error message displayed below the input */
    error?: string;
    /** Optional help text displayed below the input (hidden when error is present) */
    helpText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, helpText, ...props }, ref) => {
        const inputElement = (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    error && "border-red-500 focus-visible:ring-red-500",
                    className
                )}
                ref={ref}
                {...props}
            />
        );

        // If no label, error, or helpText provided, return just the input
        if (!label && !error && !helpText) {
            return inputElement;
        }

        // Otherwise wrap with label and helper text structure
        return (
            <div className="space-y-2">
                {label && (
                    <label className="text-sm font-medium text-foreground">
                        {label}
                    </label>
                )}
                {inputElement}
                {error && (
                    <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                )}
                {helpText && !error && (
                    <p className="text-xs text-muted-foreground">{helpText}</p>
                )}
            </div>
        );
    }
)
Input.displayName = "Input"

export { Input }
