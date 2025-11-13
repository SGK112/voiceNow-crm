import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function IntegrationCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const service = searchParams.get('service') || 'google'; // Default to google

      if (error) {
        console.error('OAuth error:', error);
        toast.error('Integration connection was cancelled or failed');
        navigate('/app/integrations');
        return;
      }

      if (!code) {
        toast.error('No authorization code received');
        navigate('/app/integrations');
        return;
      }

      try {
        // Send the authorization code to backend
        const response = await api.get(`/integrations/${service}/callback`, {
          params: { code }
        });

        if (response.data.success) {
          toast.success(`Successfully connected to ${response.data.integration.name}!`);
        }

        navigate('/app/integrations');
      } catch (error) {
        console.error('Integration callback error:', error);
        toast.error(error.response?.data?.message || 'Failed to complete integration');
        navigate('/app/integrations');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Connecting integration...</h2>
        <p className="text-muted-foreground">Please wait while we complete the setup</p>
      </div>
    </div>
  );
}
