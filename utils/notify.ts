import toast from 'react-hot-toast'

/**
 * Unified notification system using react-hot-toast
 */

export const notify = {
    /**
     * Show a success toast
     */
    success: (message: string) => {
        return toast.success(message, {
            duration: 3000,
            position: 'top-right',
            style: {
                background: '#10b981',
                color: '#fff',
                fontWeight: '500',
            },
        })
    },

    /**
     * Show an error toast
     */
    error: (message: string) => {
        return toast.error(message, {
            duration: 5000,
            position: 'top-right',
            style: {
                background: '#ef4444',
                color: '#fff',
                fontWeight: '500',
            },
        })
    },

    /**
     * Show a loading toast
     * Returns the toast ID which can be used to dismiss it later
     */
    loading: (message: string) => {
        return toast.loading(message, {
            position: 'top-right',
            style: {
                background: '#3b82f6',
                color: '#fff',
                fontWeight: '500',
            },
        })
    },

    /**
     * Dismiss a specific toast by ID
     */
    dismiss: (toastId: string) => {
        toast.dismiss(toastId)
    },

    /**
     * Dismiss all toasts
     */
    dismissAll: () => {
        toast.dismiss()
    },

    /**
     * Show a promise-based toast
     * Automatically shows loading, success, or error based on promise state
     */
    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string
            success: string
            error: string
        }
    ) => {
        return toast.promise(
            promise,
            {
                loading: messages.loading,
                success: messages.success,
                error: messages.error,
            },
            {
                position: 'top-right',
                style: {
                    fontWeight: '500',
                },
            }
        )
    },
}
