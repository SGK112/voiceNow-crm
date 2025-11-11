import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { GOOGLE_CLIENT_ID } from '@/config/oauth';

// Google OAuth Sign-In Component using official GSI button
export default function GoogleSignInButton({ onSuccess }) {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const buttonContainerRef = useRef(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not configured');
      return;
    }

    // Check if script is already loaded
    if (window.google?.accounts?.id) {
      setIsScriptLoaded(true);
      initializeGoogleSignIn();
      return;
    }

    // Load Google's GSI script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.accounts?.id) {
        console.log('Google GSI script loaded successfully');
        setIsScriptLoaded(true);
        initializeGoogleSignIn();
      }
    };

    script.onerror = () => {
      console.error('Failed to load Google GSI script');
      toast.error('Failed to load Google Sign-In');
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount to prevent reload issues
    };
  }, []);

  const initializeGoogleSignIn = () => {
    if (!window.google?.accounts?.id || !buttonContainerRef.current) {
      return;
    }

    try {
      // Initialize with callback
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      // Render the button
      window.google.accounts.id.renderButton(
        buttonContainerRef.current,
        {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: buttonContainerRef.current.offsetWidth || 300,
          type: 'standard',
        }
      );

      console.log('Google Sign-In button rendered');
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error);
      toast.error('Failed to initialize Google Sign-In');
    }
  };

  const handleCredentialResponse = async (response) => {
    try {
      console.log('Google Sign-In response received');

      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

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
      ref={buttonContainerRef}
      className="w-full"
      style={{ minHeight: '44px' }}
    />
  );
}
