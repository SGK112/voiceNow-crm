import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [apiKeys, setApiKeys] = useState({ elevenlabs: '', twilio: '', sendgrid: '' });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings().then(res => res.data),
  });

  const updateApiKeysMutation = useMutation({
    mutationFn: (data) => settingsApi.updateApiKeys(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      alert('API keys updated successfully');
    },
  });

  const handleSaveApiKeys = () => {
    const filtered = Object.fromEntries(
      Object.entries(apiKeys).filter(([_, value]) => value !== '')
    );
    if (Object.keys(filtered).length > 0) {
      updateApiKeysMutation.mutate(filtered);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Your company details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={user?.company} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phone Numbers</CardTitle>
          <CardDescription>Manage your phone numbers for agents</CardDescription>
        </CardHeader>
        <CardContent>
          {settings?.phoneNumbers && settings.phoneNumbers.length > 0 ? (
            <div className="space-y-2">
              {settings.phoneNumbers.map((phone, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span>{phone.number}</span>
                  <span className="text-sm text-muted-foreground">{phone.provider}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No phone numbers configured</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
