import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './AuthPage.css';

export default function AuthPage({ mode }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const isLogin = mode === 'login';

  const validate = () => {
    const e = {};
    if (!isLogin && !form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    else if (!isLogin && form.password.length < 6) e.password = 'Min 6 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      if (isLogin) await login(form.email, form.password);
      else await signup(form.name, form.email, form.password);
      navigate('/dashboard');
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong';
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow glow-1" />
        <div className="auth-glow glow-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-card slide-up">
        <div className="auth-logo">
          <div className="logo-mark" style={{ width: 48, height: 48, borderRadius: 14, fontSize: 18 }}>TF</div>
          <h1>TaskFlow</h1>
        </div>

        <div className="auth-header">
          <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p>{isLogin ? 'Sign in to your workspace' : 'Start managing your team tasks'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                className={`input ${errors.name ? 'input-error' : ''}`}
                type="text"
                placeholder="Alex Johnson"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              className={`input ${errors.email ? 'input-error' : ''}`}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              className={`input ${errors.password ? 'input-error' : ''}`}
              type="password"
              placeholder={isLogin ? '••••••••' : 'Min 6 characters'}
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="auth-footer">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link to={isLogin ? '/signup' : '/login'}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
}
