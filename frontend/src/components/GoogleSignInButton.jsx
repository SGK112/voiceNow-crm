import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/api';

export default function GoogleSignInButton({ onSuccess }) {
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await api.post('/auth/google', {
        credential: credentialResponse.credential
      });

      // Store token
      localStorage.setItem('token', response.data.token);

      // Set auth header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      toast.success('Successfully signed in with Google!');

      if (onSuccess) {
        onSuccess(response.data);
      } else {
        navigate('/app/dashboard');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error(error.response?.data?.message || 'Failed to sign in with Google');
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in failed. Please try again.');
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        logo_alignment="left"
        width="384"
      />
    </div>
  );
}
