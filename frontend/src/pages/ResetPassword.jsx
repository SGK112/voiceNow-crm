import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const method = location.state?.method || 'email';
  const email = location.state?.email || '';
  const phone = location.state?.phone || '';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Backend expects: email, code, newPassword
      const payload = {
        email,
        code,
        newPassword
      };

      const response = await api.post('/auth/reset-password', payload);

      // Store token and user data
      localStorage.setItem('token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      setUser({
        _id: response.data.user._id,
        email: response.data.user.email,
        company: response.data.user.company,
        plan: response.data.user.plan
      });

      toast.success('Password reset successful!');
      navigate('/app/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter the code we sent to {method === 'email' ? 'your email' : 'your phone'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Reset Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent via {method} to {email}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm space-y-2">
            <div>
              <Link to="/forgot-password" className="text-primary hover:underline">
                Resend code
              </Link>
            </div>
            <div>
              <Link to="/login" className="text-muted-foreground hover:underline">
                Back to login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
