import { Component } from 'react';
import { STORAGE_KEY } from '../constants';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#0f0f1a',
            color: '#e8e8f0',
            fontFamily: "'Space Grotesk', sans-serif",
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 320 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: 'rgba(232,232,240,0.6)', margin: '0 0 20px' }}>
              Your saved data may be corrupted. Reset to start fresh.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: '#ee1515',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset app data
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
