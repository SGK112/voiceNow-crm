import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, billingApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CreditCard,
  Download,
  Check,
  X,
  TrendingUp,
  Clock,
  MessageSquare,
  Phone,
  Mail,
  Zap,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PLANS = [
  {
    name: 'starter',
    displayName: 'Starter',
    price: 149,
    description: 'Perfect for small businesses getting started',
    features: [
      { text: '200 voice minutes/month', included: true },
      { text: '$0.60/min overage rate', included: true },
      { text: '1 AI Voice Agent', included: true },
      { text: 'Lead Capture & CRM', included: true },
      { text: 'Email Notifications', included: true },
      { text: 'Phone Number Included', included: true },
      { text: 'Basic Analytics', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ],
    popular: false,
  },
  {
    name: 'professional',
    displayName: 'Professional',
    price: 299,
    description: 'For growing teams that need more power',
    features: [
      { text: '1,000 voice minutes/month', included: true },
      { text: '$0.50/min overage rate', included: true },
      { text: '5 AI Voice Agents', included: true },
      { text: 'Advanced Lead Routing', included: true },
      { text: 'SMS Integration', included: true },
      { text: 'Workflow Automation', included: true },
      { text: 'Priority support', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'API Access', included: true },
      { text: 'Custom Integrations', included: true },
    ],
    popular: true,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 799,
    description: 'For large organizations with custom needs',
    features: [
      { text: '5,000 voice minutes/month', included: true },
      { text: '$0.40/min overage rate', included: true },
      { text: 'Unlimited AI Voice Agents', included: true },
      { text: 'White-label options', included: true },
      { text: 'Dedicated Account Manager', included: true },
      { text: 'Custom workflows & integrations', included: true },
      { text: 'Dedicated support & SLA', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'All integrations', included: true },
      { text: 'Custom contract terms', included: true },
    ],
    popular: false,
  },
];

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Billing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => subscriptionApi.getInvoices().then(res => res.data),
  });

  const { data: currentUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['currentUsage'],
    queryFn: () => billingApi.getCurrentUsage().then(res => res.data),
  });

  const { data: planDetails } = useQuery({
    queryKey: ['planDetails'],
    queryFn: () => billingApi.getPlanDetails().then(res => res.data),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: (planName) => subscriptionApi.createSubscription({ planName }),
    onSuccess: async (data) => {
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['currentUsage']);
      queryClient.invalidateQueries(['planDetails']);

      // Show success message
      if (data.data.clientSecret) {
        // Payment required - use Stripe Payment Element
        const stripe = await stripePromise;
        const { error } = await stripe.confirmPayment({
          clientSecret: data.data.clientSecret,
          confirmParams: {
            return_url: window.location.origin + '/billing',
          },
        });

        if (error) {
          alert('Payment failed: ' + error.message);
        }
      } else {
        // Trial subscription created successfully
        alert(`Subscription activated successfully! ${data.data.trialEnd ? 'Your trial ends on ' + new Date(data.data.trialEnd).toLocaleDateString() : ''}`);
        setLoadingPlan(null);
        setTimeout(() => window.location.reload(), 1000);
      }
    },
    onError: (error) => {
      alert('Error: ' + (error.response?.data?.message || 'Failed to create subscription'));
      setLoadingPlan(null);
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: (planName) => subscriptionApi.updateSubscription({ planName }),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setLoadingPlan(null);
      alert('Subscription updated successfully!');
    },
    onError: (error) => {
      alert('Error: ' + (error.response?.data?.message || 'Failed to update subscription'));
      setLoadingPlan(null);
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => subscriptionApi.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      alert('Subscription canceled successfully. You will have access until the end of your billing period.');
    },
    onError: (error) => {
      alert('Error: ' + (error.response?.data?.message || 'Failed to cancel subscription'));
    },
  });

  const handlePlanClick = (planName) => {
    if (loadingPlan) return;

    setLoadingPlan(planName);

    if (user?.subscriptionId) {
      // User has existing subscription - update it
      if (confirm(`Switch to ${planName} plan? Your billing will be prorated.`)) {
        updateSubscriptionMutation.mutate(planName);
      } else {
        setLoadingPlan(null);
      }
    } else {
      // User doesn't have subscription - create new one
      createSubscriptionMutation.mutate(planName);
    }
  };

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.')) {
      cancelSubscriptionMutation.mutate();
    }
  };

  // Real usage data from API with fallback to mock data for development
  const usageData = currentUsage ? {
    voiceMinutes: {
      used: currentUsage.minutesUsed || 0,
      limit: currentUsage.minutesIncluded || 50,
      unit: 'minutes'
    },
    overageMinutes: currentUsage.overageMinutes || 0,
    overageCharge: currentUsage.overageCharge || 0,
    totalCalls: currentUsage.totalCalls || 0,
    // Mock data for other metrics until they're implemented
    aiTokens: { used: 0, limit: 10000, unit: 'tokens' },
    smsMessages: { used: 0, limit: 1000, unit: 'messages' },
    emailsSent: { used: 0, limit: 5000, unit: 'emails' },
  } : {
    voiceMinutes: { used: 0, limit: 50, unit: 'minutes' },
    overageMinutes: 0,
    overageCharge: 0,
    totalCalls: 0,
    aiTokens: { used: 0, limit: 10000, unit: 'tokens' },
    smsMessages: { used: 0, limit: 1000, unit: 'messages' },
    emailsSent: { used: 0, limit: 5000, unit: 'emails' },
  };

  const getUsagePercentage = (used, limit) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription, usage, and invoices</p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
            <Badge
              variant={user?.subscriptionStatus === 'active' ? 'success' : 'secondary'}
              className="text-sm px-3 py-1"
            >
              {user?.subscriptionStatus || 'trialing'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold capitalize">
                {user?.plan || 'trial'} Plan
              </div>
              <p className="text-muted-foreground mt-2">
                {user?.plan === 'starter' && '$149/month'}
                {user?.plan === 'professional' && '$299/month'}
                {user?.plan === 'enterprise' && '$799/month'}
                {user?.plan === 'trial' && 'Free Trial'}
              </p>
              {user?.subscriptionEndDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  Next billing date: {formatDate(new Date(user.subscriptionEndDate))}
                </p>
              )}
            </div>
            {user?.subscriptionId && (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={cancelSubscriptionMutation.isPending}
              >
                {cancelSubscriptionMutation.isPending ? 'Canceling...' : 'Cancel Plan'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overage Alert */}
      {usageData.overageMinutes > 0 && (
        <Alert variant="destructive">
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            You've used {usageData.overageMinutes} minutes beyond your plan limit this month.
            You'll be charged {formatCurrency(usageData.overageCharge)} for overages at the end of your billing cycle.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage This Month
          </CardTitle>
          <CardDescription>Track your monthly consumption across all services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voice Minutes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Voice Minutes</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {usageData.voiceMinutes.used.toLocaleString()} / {usageData.voiceMinutes.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.voiceMinutes.used, usageData.voiceMinutes.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {getUsagePercentage(usageData.voiceMinutes.used, usageData.voiceMinutes.limit).toFixed(1)}% used
                </span>
                {getUsagePercentage(usageData.voiceMinutes.used, usageData.voiceMinutes.limit) >= 90 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Near Limit
                  </Badge>
                )}
              </div>
            </div>

            {/* AI Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">AI Tokens</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {usageData.aiTokens.used.toLocaleString()} / {usageData.aiTokens.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.aiTokens.used, usageData.aiTokens.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {getUsagePercentage(usageData.aiTokens.used, usageData.aiTokens.limit).toFixed(1)}% used
                </span>
              </div>
            </div>

            {/* SMS Messages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span className="font-medium">SMS Messages</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {usageData.smsMessages.used.toLocaleString()} / {usageData.smsMessages.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.smsMessages.used, usageData.smsMessages.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {getUsagePercentage(usageData.smsMessages.used, usageData.smsMessages.limit).toFixed(1)}% used
                </span>
              </div>
            </div>

            {/* Emails Sent */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Emails Sent</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {usageData.emailsSent.used.toLocaleString()} / {usageData.emailsSent.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.emailsSent.used, usageData.emailsSent.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {getUsagePercentage(usageData.emailsSent.used, usageData.emailsSent.limit).toFixed(1)}% used
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Available Plans</h2>
        <p className="text-muted-foreground mb-6">Choose the plan that best fits your needs. Upgrade or downgrade anytime.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? 'border-2 border-blue-500 dark:border-blue-600 shadow-lg' : ''} ${user?.plan === plan.name ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-4 py-1">Most Popular</Badge>
                </div>
              )}
              {user?.plan === plan.name && (
                <div className="absolute -top-4 right-4">
                  <Badge className="bg-green-500 text-white px-4 py-1">Current Plan</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.displayName}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? '' : 'text-muted-foreground'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={user?.plan === plan.name ? 'outline' : 'default'}
                  disabled={user?.plan === plan.name || loadingPlan === plan.name}
                  onClick={() => handlePlanClick(plan.name)}
                >
                  {loadingPlan === plan.name ? (
                    'Processing...'
                  ) : user?.plan === plan.name ? (
                    'Current Plan'
                  ) : (
                    `${user?.subscriptionId ? 'Switch to' : 'Upgrade to'} ${plan.displayName}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Invoice History
          </CardTitle>
          <CardDescription>View and download your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading invoices...</p>
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {formatDate(new Date(invoice.created * 1000))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{invoice.number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(invoice.amount_paid / 100)}
                      </p>
                      <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                        {invoice.status}
                      </Badge>
                    </div>
                    {invoice.invoice_pdf && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your invoices will appear here once you subscribe to a plan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
