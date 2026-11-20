import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/common/UI';

export function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasGoogleAuth = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      await googleLogin(credentialResponse.credential);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-ivory-50 border border-sand-300 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-ivory-50 flex items-center justify-center font-black text-2xl mx-auto mb-3 shadow-md">
            E
          </div>
          <h2 className="text-2xl font-black text-espresso-900 tracking-tight">Welcome back</h2>
          <p className="text-xs text-espresso-700 mt-1">Sign in to resume your study streak</p>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            placeholder="e.g. vamsi@eduwrap.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" variant="primary" className="w-full mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {/* Google Authentication */}
        {hasGoogleAuth && (
          <div className="mt-5 space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-sand-300 w-full" />
              <span className="bg-ivory-50 px-3 text-[11px] font-bold text-espresso-500 uppercase tracking-wider relative">
                or continue with
              </span>
            </div>

            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In could not be initialized')}
                shape="pill"
                theme="outline"
                text="signin_with"
                size="large"
                width="100%"
              />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-espresso-700 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-amber-600 hover:text-amber-700 underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
