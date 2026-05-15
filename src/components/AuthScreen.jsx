import { useState } from 'react';

export default function AuthScreen({ onLogin, onSignup, busy }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onSignup(email, password);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="wallet-avatar auth-avatar">⚡</div>
        <h1 className="auth-title">PokéFolio</h1>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Sign in to access your collection on any device.'
            : 'Create an account — your cards are stored on your private server.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          <label className="field-label">
            Email
            <input
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field-label">
            Password
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>
          {mode === 'signup' && (
            <p className="auth-hint">At least 8 characters</p>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
