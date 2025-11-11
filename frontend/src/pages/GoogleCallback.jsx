import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { googleLogin } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('Google OAuth error:', error);
        toast.error('Google sign-in was cancelled or failed');
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error('No authorization code received');
        navigate('/login');
        return;
      }

      try {
        // Send the authorization code to the backend
        const userData = await googleLogin({
          code: code,
          tokenType: 'authorization_code',
          redirectUri: `${window.location.origin}/auth/google/callback`
        });

        toast.success('Successfully signed in with Google!');
        navigate('/app/dashboard');
      } catch (error) {
        console.error('Google sign-in error:', error);
        toast.error(error.response?.data?.message || 'Failed to sign in with Google');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, googleLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Signing you in with Google...</h2>
        <p className="text-muted-foreground">Please wait</p>
      </div>
    </div>
  );
}
