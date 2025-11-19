import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function ForgotPassword() {
  const [method, setMethod] = useState('email'); // 'email' or 'sms'
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = method === 'email'
        ? { email: identifier, method: 'email' }
        : { email: identifier, phone: identifier, method: 'sms' };

      const response = await api.post('/auth/forgot-password', payload);

      toast.success(response.data.message);

      navigate('/reset-password', {
        state: {
          method,
          email: identifier
        }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            We'll send you a code to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Method Selection */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={method === 'email' ? 'default' : 'outline'}
                onClick={() => { setMethod('email'); setIdentifier(''); }}
                className="flex-1"
              >
                Email
              </Button>
              <Button
                type="button"
                variant={method === 'sms' ? 'default' : 'outline'}
                onClick={() => { setMethod('sms'); setIdentifier(''); }}
                className="flex-1"
              >
                SMS
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">
                {method === 'email' ? 'Email Address' : 'Phone Number'}
              </Label>
              <Input
                id="identifier"
                type={method === 'email' ? 'email' : 'tel'}
                placeholder={method === 'email' ? 'you@company.com' : '+1 (555) 123-4567'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                {method === 'email'
                  ? "We'll send a 6-digit code to your email"
                  : "We'll send a 6-digit code via SMS"
                }
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
