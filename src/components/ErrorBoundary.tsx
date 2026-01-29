import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
        this.setState({ errorInfo })
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-rose-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full border border-rose-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">程序遇到了一点问题</h1>
                            <p className="text-sm text-gray-500 mb-6">我们检测到了一个未知的错误，导致页面无法正常显示。</p>

                            <div className="w-full bg-gray-50 p-4 rounded-lg text-left overflow-auto max-h-64 mb-6 border border-gray-200">
                                <p className="text-xs font-bold text-red-600 mb-1">
                                    {this.state.error?.toString()}
                                </p>
                                <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap">
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </div>

                            <div className="flex gap-3 w-full">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    刷新页面
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${this.state.error}\n${this.state.errorInfo?.componentStack}`)
                                        alert('错误信息已复制')
                                    }}
                                    className="flex-1 border-rose-200 text-rose-500"
                                >
                                    复制错误信息
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
