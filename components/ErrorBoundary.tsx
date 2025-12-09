'use client'

import React from 'react'
import { ErrorDisplay } from './ErrorDisplay'

interface ErrorBoundaryProps {
    children: React.ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
        }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    handleRefresh = () => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorDisplay
                    error={this.state.error}
                    reset={this.handleRefresh}
                />
            )
        }

        return this.props.children
    }
}
