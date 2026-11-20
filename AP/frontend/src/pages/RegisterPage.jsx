import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/common/UI';

export function RegisterPage() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dailyGoal, setDailyGoal] = useState(20);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasGoogleAuth = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        daily_goal: dailyGoal,
      });
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      await googleLogin(credentialResponse.credential, dailyGoal);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Google registration failed');
    } finally {
      setLoading(false);
    }
  };

  const goalOptions = [10, 20, 30, 50];

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-ivory-50 border border-sand-300 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-ivory-50 flex items-center justify-center font-black text-2xl mx-auto mb-3 shadow-md">
            E
          </div>
          <h2 className="text-2xl font-black text-espresso-900 tracking-tight">Create your account</h2>
          <p className="text-xs text-espresso-700 mt-1">Join your university study cohort on EduWrap</p>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Daily Goal Selection */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-espresso-700 mb-2 uppercase tracking-wider">
            Daily Flashcard Goal
          </label>
          <div className="grid grid-cols-4 gap-2">
            {goalOptions.map((goal) => (
              <button
                type="button"
                key={goal}
                onClick={() => setDailyGoal(goal)}
                className={`py-2 text-sm font-bold rounded-xl border transition ${
                  dailyGoal === goal
                    ? 'bg-amber-500 text-ivory-50 border-amber-500 shadow-sm'
                    : 'bg-cream-150 text-espresso-700 border-sand-300 hover:border-espresso-500'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            required
            placeholder="e.g. Vamsi Krishna"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" variant="primary" className="w-full mt-4" disabled={loading}>
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </Button>
        </form>

        {/* Google Authentication */}
        {hasGoogleAuth && (
          <div className="mt-5 space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-sand-300 w-full" />
              <span className="bg-ivory-50 px-3 text-[11px] font-bold text-espresso-500 uppercase tracking-wider relative">
                or sign up with
              </span>
            </div>

            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In could not be initialized')}
                shape="pill"
                theme="outline"
                text="signup_with"
                size="large"
                width="100%"
              />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-espresso-700 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-amber-600 hover:text-amber-700 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
