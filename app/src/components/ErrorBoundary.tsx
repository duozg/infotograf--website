import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            color: 'var(--text-secondary)',
            fontSize: 14,
            gap: 12,
          }}
        >
          <div>Something went wrong.</div>
          <button
            style={{
              background: 'none',
              border: '1px solid var(--divider-card)',
              borderRadius: 4,
              padding: '6px 16px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 14,
            }}
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
