import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
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
  AlertCircle
} from 'lucide-react';

const PLANS = [
  {
    name: 'starter',
    displayName: 'Starter',
    price: 49,
    description: 'Perfect for small businesses getting started',
    features: [
      { text: '500 voice minutes/month', included: true },
      { text: '10,000 AI tokens/month', included: true },
      { text: '1,000 SMS messages/month', included: true },
      { text: '5,000 emails/month', included: true },
      { text: '5 AI agents', included: true },
      { text: '2 team members', included: true },
      { text: 'Basic support', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'QuickBooks integration', included: false },
      { text: 'Priority support', included: false },
    ],
    popular: false,
  },
  {
    name: 'professional',
    displayName: 'Professional',
    price: 99,
    description: 'For growing teams that need more power',
    features: [
      { text: '2,000 voice minutes/month', included: true },
      { text: '50,000 AI tokens/month', included: true },
      { text: '5,000 SMS messages/month', included: true },
      { text: '25,000 emails/month', included: true },
      { text: 'Unlimited AI agents', included: true },
      { text: '10 team members', included: true },
      { text: 'Priority support', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'QuickBooks integration', included: true },
      { text: 'Custom branding', included: false },
    ],
    popular: true,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 299,
    description: 'For large organizations with custom needs',
    features: [
      { text: '10,000 voice minutes/month', included: true },
      { text: '250,000 AI tokens/month', included: true },
      { text: '25,000 SMS messages/month', included: true },
      { text: 'Unlimited emails', included: true },
      { text: 'Unlimited AI agents', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'All integrations', included: true },
      { text: 'Custom branding', included: true },
    ],
    popular: false,
  },
];

export default function Billing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => subscriptionApi.getInvoices().then(res => res.data),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: (planName) => subscriptionApi.createSubscription({ planName }),
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.data.clientSecret) {
        // In a real implementation, you would use Stripe.js to handle the payment
        alert('Stripe Checkout integration would open here. Client Secret: ' + data.data.clientSecret.substring(0, 20) + '...');
      }
      queryClient.invalidateQueries(['user']);
      setLoadingPlan(null);
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

  // Mock usage data - in production, this would come from the API
  const usageData = {
    voiceMinutes: { used: 347, limit: 2000, unit: 'minutes' },
    aiTokens: { used: 23450, limit: 50000, unit: 'tokens' },
    smsMessages: { used: 1234, limit: 5000, unit: 'messages' },
    emailsSent: { used: 8900, limit: 25000, unit: 'emails' },
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
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your subscription, usage, and invoices</p>
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
              <div className="text-3xl font-bold capitalize text-gray-900">
                {user?.plan || 'trial'} Plan
              </div>
              <p className="text-gray-600 mt-2">
                {user?.plan === 'starter' && '$49/month'}
                {user?.plan === 'professional' && '$99/month'}
                {user?.plan === 'enterprise' && '$299/month'}
                {user?.plan === 'trial' && 'Free Trial'}
              </p>
              {user?.subscriptionEndDate && (
                <p className="text-sm text-gray-500 mt-1">
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
                  <span className="font-medium text-gray-900">Voice Minutes</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {usageData.voiceMinutes.used.toLocaleString()} / {usageData.voiceMinutes.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.voiceMinutes.used, usageData.voiceMinutes.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
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
                  <span className="font-medium text-gray-900">AI Tokens</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {usageData.aiTokens.used.toLocaleString()} / {usageData.aiTokens.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.aiTokens.used, usageData.aiTokens.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {getUsagePercentage(usageData.aiTokens.used, usageData.aiTokens.limit).toFixed(1)}% used
                </span>
              </div>
            </div>

            {/* SMS Messages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-gray-900">SMS Messages</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {usageData.smsMessages.used.toLocaleString()} / {usageData.smsMessages.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.smsMessages.used, usageData.smsMessages.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {getUsagePercentage(usageData.smsMessages.used, usageData.smsMessages.limit).toFixed(1)}% used
                </span>
              </div>
            </div>

            {/* Emails Sent */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-gray-900">Emails Sent</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {usageData.emailsSent.used.toLocaleString()} / {usageData.emailsSent.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getUsagePercentage(usageData.emailsSent.used, usageData.emailsSent.limit)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {getUsagePercentage(usageData.emailsSent.used, usageData.emailsSent.limit).toFixed(1)}% used
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Plans</h2>
        <p className="text-gray-600 mb-6">Choose the plan that best fits your needs. Upgrade or downgrade anytime.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? 'border-2 border-blue-500 shadow-lg' : ''} ${user?.plan === plan.name ? 'bg-blue-50' : ''}`}
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
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.displayName}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-gray-900' : 'text-gray-500'}`}>
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
              <p className="text-gray-600 mt-2">Loading invoices...</p>
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDate(new Date(invoice.created * 1000))}
                      </p>
                      <p className="text-sm text-gray-600">
                        Invoice #{invoice.number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
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
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No invoices yet</p>
              <p className="text-sm text-gray-500 mt-1">Your invoices will appear here once you subscribe to a plan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
