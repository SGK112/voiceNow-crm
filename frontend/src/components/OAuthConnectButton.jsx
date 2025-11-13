import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function OAuthConnectButton({
  service,
  children,
  onSuccess,
  onError,
  variant = 'default',
  size = 'default',
  className = '',
  disabled = false
}) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);

      // Get the OAuth URL from backend
      const response = await api.get(`/integrations/${service}/auth`);

      if (response.data.authUrl) {
        // Open OAuth flow in current window
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error(`${service} OAuth error:`, error);
      toast.error(error.response?.data?.message || `Failed to connect ${service}`);
      setLoading(false);
      if (onError) onError(error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleConnect}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
