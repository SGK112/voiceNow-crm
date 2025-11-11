import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { GOOGLE_CLIENT_ID } from '@/config/oauth';

// Google OAuth Sign-In Component using Google's official button
// This loads the Google Sign-In script directly for maximum compatibility
export default function GoogleSignInButton({ onSuccess }) {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) {
      console.error('Google Client ID not configured or button ref not available');
      return;
    }

    // Load Google's GSI script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google) {
        console.log('Google GSI script loaded successfully');

        // Initialize Google Sign-In
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
          context: 'signin',
        });

        // Render the button
        window.google.accounts.id.renderButton(
          buttonRef.current,
          {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: buttonRef.current.offsetWidth,
          }
        );
      }
    };

    script.onerror = () => {
      console.error('Failed to load Google GSI script');
      toast.error('Failed to load Google Sign-In');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      console.log('Google Sign-In response received');

      // Use AuthContext's googleLogin with the credential JWT
      const userData = await googleLogin({
        credential: response.credential,
        tokenType: 'id_token'
      });

      toast.success('Successfully signed in with Google!');

      if (onSuccess) {
        onSuccess(userData);
      } else {
        navigate('/app/dashboard');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error(error.response?.data?.message || 'Failed to sign in with Google');
    }
  };

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div
      ref={buttonRef}
      className="w-full"
      style={{ minHeight: '44px' }}
    />
  );
}
