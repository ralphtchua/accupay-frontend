import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';

/* =====================================================================
   Login — matches the prototype auth card. No real auth yet; "Sign In"
   routes into the app. Wired to the C# /auth endpoint in a later phase.
   ===================================================================== */

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function signIn() {
    // Phase 2 wires this to POST /api/auth/login. For now, enter the app.
    navigate('/dashboard');
  }

  return (
    <div
      style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--ao-auth-grad-from), var(--ao-auth-grad-to))',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 392, background: '#fff', border: '1px solid var(--ao-border)',
          borderRadius: 'var(--ao-r-2xl)', boxShadow: 'var(--ao-shadow-auth)',
          padding: '38px 36px', textAlign: 'center',
        }}
      >
        <img src={logo} alt="Access Offshoring" style={{ width: 200, borderRadius: 10, display: 'block', margin: '0 auto' }} />
        <div style={{ font: '700 20px var(--ao-font)', color: 'var(--ao-text)', margin: '22px 0 4px' }}>
          Sign in to your account
        </div>
        <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 24 }}>
          Time &amp; Attendance System
        </div>

        <div style={{ textAlign: 'left', marginBottom: 14 }}>
          <label className="ao-label">Email</label>
          <input
            className="ao-input" type="email" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={{ textAlign: 'left', marginBottom: 22 }}>
          <label className="ao-label">Password</label>
          <input
            className="ao-input" type="password" placeholder="Enter your password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && signIn()}
          />
        </div>

        <button
          onClick={signIn}
          className="ao-btn ao-btn--primary"
          style={{ width: '100%', height: 44 }}
        >
          Sign In
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, font: '500 12px var(--ao-font)' }}>
          <span style={{ color: 'var(--ao-muted)', cursor: 'pointer' }}>Forgot password?</span>
          <span style={{ color: 'var(--ao-primary)', cursor: 'pointer', fontWeight: 600 }}>Register</span>
        </div>
      </div>
    </div>
  );
}
