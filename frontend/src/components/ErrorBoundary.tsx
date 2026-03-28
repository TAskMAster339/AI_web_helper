import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Что-то пошло не так
            </h1>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
              Произошла непредвиденная ошибка. Попробуйте обновить страницу.
            </p>
            {this.state.error && (
              <details
                className="text-left mb-4 p-3 rounded"
                style={{ background: 'var(--bg-surface)' }}
              >
                <summary
                  className="cursor-pointer text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Детали ошибки
                </summary>
                <pre className="mt-2 text-xs overflow-auto" style={{ color: 'var(--error)' }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleReset} className="btn-primary px-4 py-2 rounded-lg">
                Попробовать снова
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Обновить страницу
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
