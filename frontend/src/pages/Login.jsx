import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

      // Skip onboarding - users can complete profile later in Settings
      // All users go directly to dashboard for quick access
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4">
      <Card className="w-full max-w-md shadow-xl bg-[#141416] border-gray-900">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Welcome to VoiceFlow CRM</CardTitle>
          <CardDescription className="text-gray-400">Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#1f1f23] border-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Link to="/forgot-password" className="text-sm text-blue-400 hover:underline">
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
                className="bg-[#1f1f23] border-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Google Sign-In - Only show if client ID is configured */}
          {GOOGLE_CLIENT_ID && (
            <>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-900" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#141416] px-2 text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign-In */}
              <GoogleSignInButton />
            </>
          )}

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-400">Don't have an account? </span>
            <Link to="/signup" className="text-blue-400 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
