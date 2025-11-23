import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { Check, Sparkles } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup(email, password, company);
      // Skip onboarding - users go directly to dashboard
      // Profile can be completed later in Settings
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4 py-8">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">
        {/* Signup Form */}
        <Card className="w-full shadow-xl bg-[#141416] border-gray-900">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Create your account</CardTitle>
            <CardDescription className="text-gray-400">Get started with VoiceFlow CRM</CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="company" className="text-gray-300">Company Name</Label>
              <Input
                id="company"
                type="text"
                placeholder="Acme Inc"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="bg-[#1f1f23] border-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

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
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-[#1f1f23] border-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Google Sign-In - Only show if client ID is configured */}
          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
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
            <span className="text-gray-400">Already have an account? </span>
            <Link to="/login" className="text-blue-400 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Information */}
      <div className="space-y-4">
        {/* Free Trial Card */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-600/20 border-blue-900/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-full">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">Start Free - No Credit Card Required</h3>
                <p className="text-sm text-gray-400">Get 100 free credits to try all features</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Check className="h-4 w-4 text-green-400" />
                <span>100 free credits (~100 minutes of calls)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Check className="h-4 w-4 text-green-400" />
                <span>Full access to all features</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Check className="h-4 w-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Check className="h-4 w-4 text-green-400" />
                <span>Credits never expire</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Options Card */}
        <Card className="bg-[#141416] border-gray-900">
          <CardHeader>
            <CardTitle className="text-lg text-white">Flexible Pricing After Trial</CardTitle>
            <CardDescription className="text-gray-400">Choose what works best for you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Credit Packages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">Pay-As-You-Go Credits</h4>
                <Badge variant="outline" className="border-gray-800 text-gray-300">From $49</Badge>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                Perfect for sporadic usage - credits never expire
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• $0.05-$0.10 per minute</div>
                <div>• No monthly commitment</div>
                <div>• Use at your own pace</div>
              </div>
            </div>

            <div className="border-t border-gray-900 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">Monthly Subscriptions</h4>
                <Badge variant="outline" className="border-gray-800 text-gray-300">From $99/mo</Badge>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                Best for regular usage with CRM features included
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• 200-5,000 minutes included</div>
                <div>• Full CRM & workflow access</div>
                <div>• Priority support</div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-900">
              <Link to="/pricing">
                <Button variant="link" className="w-full p-0 h-auto text-blue-400 hover:underline">
                  View detailed pricing comparison →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Trust Badges */}
        <Card className="bg-[#141416] border-gray-900">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-gray-300">30-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-gray-300">Cancel anytime, no questions asked</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-gray-300">No hidden fees or surprises</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
