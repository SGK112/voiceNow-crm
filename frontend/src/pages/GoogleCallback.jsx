import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/utils/toast';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { googleLogin } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      console.log('🔍 [GoogleCallback] Callback triggered:', {
        hasCode: !!code,
        hasError: !!error,
        fullUrl: window.location.href
      });

      if (error) {
        console.error('Google OAuth error:', error);
        toast.error('Google sign-in was cancelled or failed');
        navigate('/login');
        return;
      }

      if (!code) {
        console.error('❌ No authorization code in URL');
        toast.error('No authorization code received');
        navigate('/login');
        return;
      }

      const payload = {
        code: code,
        tokenType: 'authorization_code',
        redirectUri: `${window.location.origin}/auth/google/callback`
      };

      console.log('📤 [GoogleCallback] Sending to backend:', payload);

      try {
        // Send the authorization code to the backend
        const userData = await googleLogin(payload);

        console.log('✅ [GoogleCallback] Login successful:', userData);
        toast.success('Successfully signed in with Google!');
        navigate('/app/dashboard');
      } catch (error) {
        console.error('❌ [GoogleCallback] Login failed:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
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
