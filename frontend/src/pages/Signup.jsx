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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4 py-8">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">
        {/* Signup Form */}
        <Card className="w-full shadow-xl dark:bg-black border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 text-foreground">Create your account</CardTitle>
            <CardDescription className="text-gray-700 text-foreground">Get started with VoiceFlow CRM</CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="company" className="text-gray-900 text-foreground">Company Name</Label>
              <Input
                id="company"
                type="text"
                placeholder="Acme Inc"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-gray-600 text-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign-In */}
              <GoogleSignInButton />
            </>
          )}

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600 text-foreground">Already have an account? </span>
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Information */}
      <div className="space-y-4">
        {/* Free Trial Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-blue-600/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-full">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Start Free - No Credit Card Required</h3>
                <p className="text-sm text-muted-foreground">Get 100 free credits to try all features</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>100 free credits (~100 minutes of calls)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Full access to all features</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Credits never expire</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Options Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flexible Pricing After Trial</CardTitle>
            <CardDescription>Choose what works best for you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Credit Packages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Pay-As-You-Go Credits</h4>
                <Badge variant="outline">From $49</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Perfect for sporadic usage - credits never expire
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• $0.05-$0.10 per minute</div>
                <div>• No monthly commitment</div>
                <div>• Use at your own pace</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Monthly Subscriptions</h4>
                <Badge variant="outline">From $99/mo</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Best for regular usage with CRM features included
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• 200-5,000 minutes included</div>
                <div>• Full CRM & workflow access</div>
                <div>• Priority support</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Link to="/pricing">
                <Button variant="link" className="w-full p-0 h-auto text-primary hover:underline">
                  View detailed pricing comparison →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Trust Badges */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">30-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Cancel anytime, no questions asked</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">No hidden fees or surprises</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
