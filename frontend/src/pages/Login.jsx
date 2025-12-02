import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { GOOGLE_CLIENT_ID } from '@/config/oauth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Dark radial gradient background - matches marketing */}
      <div
        className="fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0b 50%, #000000 100%)',
          backgroundAttachment: 'fixed'
        }}
      />

      {/* Dot grid overlay - matches marketing */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundColor: 'transparent',
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-12">
        <div>
          {/* Logo - matches marketing exactly */}
          <Link to="/" className="flex items-center gap-3 group">
            <span className="flex items-center gap-0.5 h-10 px-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg">
              <span className="w-0.5 h-2 bg-white/80 rounded-full"></span>
              <span className="w-0.5 h-4 bg-white rounded-full"></span>
              <span className="w-0.5 h-3 bg-white/80 rounded-full"></span>
              <span className="w-0.5 h-5 bg-white rounded-full"></span>
              <span className="w-0.5 h-2 bg-white/80 rounded-full"></span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">VoiceNow</span>
              <span className="text-xl font-bold text-blue-400">CRM</span>
            </div>
          </Link>
        </div>

        {/* Hero content */}
        <div className="space-y-8">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            <span className="text-white">AI Voice Agents</span>
            <span className="block mt-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              That Work 24/7
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md leading-relaxed">
            Stop losing deals to slow follow-ups. Let AI handle calls, qualify leads, and book meetings while you focus on closing.
          </p>

          {/* Stats */}
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-3xl font-bold text-white">300%</div>
              <div className="text-sm text-gray-500">More qualified leads</div>
            </div>
            <div className="w-px bg-gray-700" />
            <div>
              <div className="text-3xl font-bold text-green-400">24/7</div>
              <div className="text-sm text-gray-500">Always available</div>
            </div>
            <div className="w-px bg-gray-700" />
            <div>
              <div className="text-3xl font-bold text-blue-400">5min</div>
              <div className="text-sm text-gray-500">Setup time</div>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="rounded-xl p-5 bg-[#1a1a1c] border border-gray-800">
          <p className="text-white text-base leading-relaxed mb-4">
            "VoiceNow CRM transformed our business. We went from missing 40% of calls to capturing every single lead. The ROI was immediate."
          </p>
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face"
              alt="Customer"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <div className="text-white text-sm font-medium">Mike Rodriguez</div>
              <div className="text-gray-400 text-xs">Construction CEO</div>
            </div>
            <div className="flex gap-0.5 ml-auto">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex items-center gap-0.5 h-10 px-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg">
                <span className="w-0.5 h-2 bg-white/80 rounded-full"></span>
                <span className="w-0.5 h-4 bg-white rounded-full"></span>
                <span className="w-0.5 h-3 bg-white/80 rounded-full"></span>
                <span className="w-0.5 h-5 bg-white rounded-full"></span>
                <span className="w-0.5 h-2 bg-white/80 rounded-full"></span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-white">VoiceNow</span>
                <span className="text-xl font-bold text-blue-400">CRM</span>
              </div>
            </Link>
          </div>

          {/* Form card - dark card style matching marketing */}
          <div
            className="rounded-2xl p-8 border border-blue-500/20 overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 16, 0.95) 0%, rgba(26, 26, 27, 0.95) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)'
              }}
            />

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-gray-400">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-black/30 border-gray-700 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300 text-sm font-medium">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-black/30 border-gray-700 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>
            </form>

            {/* Google Sign-In */}
            {GOOGLE_CLIENT_ID && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-3 text-gray-500" style={{ background: 'rgba(15, 15, 16, 0.95)' }}>
                      Or continue with
                    </span>
                  </div>
                </div>

                <GoogleSignInButton />
              </>
            )}

            <p className="mt-6 text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-300 transition-colors">Home</Link>
            <span>•</span>
            <a href="/privacy.html" className="hover:text-gray-300 transition-colors">Privacy</a>
            <span>•</span>
            <a href="/terms.html" className="hover:text-gray-300 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
