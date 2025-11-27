import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, userApiKeyApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, Plus, Key, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const AVAILABLE_SCOPES = [
  { value: 'all', label: 'Full Access', description: 'Complete access to all resources' },
  { value: 'agents.read', label: 'Read Agents', description: 'View voice agents' },
  { value: 'agents.write', label: 'Write Agents', description: 'Create and update voice agents' },
  { value: 'agents.delete', label: 'Delete Agents', description: 'Delete voice agents' },
  { value: 'calls.read', label: 'Read Calls', description: 'View call records' },
  { value: 'calls.write', label: 'Write Calls', description: 'Initiate calls' },
  { value: 'leads.read', label: 'Read Leads', description: 'View leads' },
  { value: 'leads.write', label: 'Write Leads', description: 'Create and update leads' },
  { value: 'leads.delete', label: 'Delete Leads', description: 'Delete leads' },
  { value: 'workflows.read', label: 'Read Workflows', description: 'View workflows' },
  { value: 'workflows.write', label: 'Write Workflows', description: 'Create and update workflows' },
  { value: 'workflows.execute', label: 'Execute Workflows', description: 'Trigger workflow execution' },
];

export default function AccountTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    scopes: [],
    environment: 'production',
    expiresInDays: 0,
  });
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch user API keys
  const { data: userApiKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ['userApiKeys'],
    queryFn: () => userApiKeyApi.getUserApiKeys().then(res => res.data),
  });

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: (data) => userApiKeyApi.createUserApiKey(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['userApiKeys']);
      setNewlyCreatedKey(response.data.key);
      setNewKeyData({ name: '', scopes: [], environment: 'production', expiresInDays: 0 });
    },
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: (keyId) => userApiKeyApi.deleteUserApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries(['userApiKeys']);
    },
  });

  const handleCreateKey = () => {
    if (!newKeyData.name || newKeyData.scopes.length === 0) {
      alert('Please provide a name and at least one scope');
      return;
    }
    createKeyMutation.mutate(newKeyData);
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDeleteKey = (keyId) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      deleteKeyMutation.mutate(keyId);
    }
  };

  const toggleScope = (scope) => {
    setNewKeyData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  const getPlanLimit = () => {
    const limits = {
      trial: 1,
      starter: 2,
      professional: 10,
      enterprise: Infinity
    };
    return limits[user?.plan] || 1;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email} disabled className="text-base" />
              </div>
              <div className="space-y-2">
                <Label>Current Plan</Label>
                <Badge variant="outline" className="text-sm capitalize">{user?.plan}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User API Keys Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">API keys allow you to integrate VoiceNow CRM with your own applications, automation tools, and workflows securely.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  Create and manage API keys for external integrations
                  {user?.plan && ` • ${userApiKeys.length}/${getPlanLimit()} keys used`}
                </CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={userApiKeys.length >= getPlanLimit()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create API Key</DialogTitle>
                    <DialogDescription>
                      Generate a new API key for external integrations. You'll only see the full key once.
                    </DialogDescription>
                  </DialogHeader>

                  {newlyCreatedKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                          Save this key securely!
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mb-4">
                          You won't be able to see it again. If you lose it, you'll need to create a new key.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={newlyCreatedKey}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            onClick={() => handleCopyKey(newlyCreatedKey)}
                            variant="outline"
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            {copiedKey ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setNewlyCreatedKey(null);
                          setIsCreateDialogOpen(false);
                        }}
                        className="w-full"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="keyName">Key Name</Label>
                        <Input
                          id="keyName"
                          placeholder="e.g., Production API, Mobile App"
                          value={newKeyData.name}
                          onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                          className="text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="environment">Environment</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Production keys (rwcrm_live_...) are for live applications. Development keys (rwcrm_test_...) are for testing.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select
                          value={newKeyData.environment}
                          onValueChange={(value) => setNewKeyData({ ...newKeyData, environment: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="production">Production (rwcrm_live_...)</SelectItem>
                            <SelectItem value="development">Development (rwcrm_test_...)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiration (days)</Label>
                        <Input
                          id="expiry"
                          type="number"
                          placeholder="0 for never expires"
                          value={newKeyData.expiresInDays}
                          onChange={(e) => setNewKeyData({ ...newKeyData, expiresInDays: parseInt(e.target.value) || 0 })}
                          className="text-base"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Permissions</Label>
                        <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                          {AVAILABLE_SCOPES.map((scope) => (
                            <div key={scope.value} className="flex items-start gap-3">
                              <Checkbox
                                id={scope.value}
                                checked={newKeyData.scopes.includes(scope.value)}
                                onCheckedChange={() => toggleScope(scope.value)}
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={scope.value}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {scope.label}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {scope.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setIsCreateDialogOpen(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateKey}
                          disabled={createKeyMutation.isPending}
                          className="flex-1"
                        >
                          {createKeyMutation.isPending ? 'Creating...' : 'Create Key'}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingKeys ? (
              <p className="text-muted-foreground">Loading API keys...</p>
            ) : userApiKeys.length === 0 ? (
              <p className="text-muted-foreground">No API keys created yet. Create one to get started.</p>
            ) : (
              <div className="space-y-3">
                {userApiKeys.map((key) => (
                  <div
                    key={key._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{key.name}</h4>
                        <Badge variant={key.environment === 'production' ? 'default' : 'secondary'}>
                          {key.environment}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono truncate">{key.prefix}...</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{key.scopes.length} permissions</span>
                        {key.lastUsedAt && (
                          <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        )}
                        {key.expiresAt && (
                          <span className={new Date(key.expiresAt) < new Date() ? 'text-red-500' : ''}>
                            {new Date(key.expiresAt) < new Date() ? 'Expired' : `Expires: ${new Date(key.expiresAt).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(key._id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
