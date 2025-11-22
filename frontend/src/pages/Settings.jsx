import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, Activity, User, Settings as SettingsIcon, Shield } from 'lucide-react';
import BusinessProfileTab from '@/components/settings/BusinessProfileTab';
import BillingTab from '@/components/settings/BillingTab';
import UsageTab from '@/components/settings/UsageTab';
import AccountTab from '@/components/settings/AccountTab';
import MonitoringTab from '@/components/settings/MonitoringTab';
import { useAuth } from '@/context/AuthContext';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'account');
  const { user } = useAuth();

  // Update active tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Check if user is admin (only help.remodely@gmail.com for now)
  const isAdmin = user?.email === 'help.remodely@gmail.com';

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account, business profile, billing, and usage
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} bg-transparent gap-2`}>
            <TabsTrigger value="account" className="gap-2 text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-2 text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2 text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="gap-2 text-muted-foreground data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-lg">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

        <TabsContent value="account">
          <AccountTab />
        </TabsContent>

        <TabsContent value="business">
          <BusinessProfileTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>

        <TabsContent value="usage">
          <UsageTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin">
            <MonitoringTab />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
}
