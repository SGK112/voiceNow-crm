import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Zap, TrendingUp, Star, Sparkles, ArrowRight, Calculator, HelpCircle, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import PricingCalculator from '@/components/PricingCalculator';

const SUBSCRIPTION_PLANS = [
  {
    name: 'starter',
    displayName: 'Starter',
    price: 99,
    callLimit: 200,
    effectiveRate: 0.495,
    overageRate: 0.60,
    agentLimit: 1,
    popular: false,
    description: 'Perfect for small businesses',
    features: [
      '1 AI Voice Agent',
      '200 Minutes/Month',
      '~40 calls (5 min each)',
      'Lead Capture & CRM',
      'Email Notifications',
      'Phone Number Included'
    ]
  },
  {
    name: 'professional',
    displayName: 'Professional',
    price: 299,
    callLimit: 1000,
    effectiveRate: 0.299,
    overageRate: 0.50,
    agentLimit: 5,
    popular: true,
    description: 'Best for growing teams',
    features: [
      '5 AI Voice Agents',
      '1,000 Minutes/Month',
      '~200 calls (5 min each)',
      'Advanced Workflows',
      'SMS & Email Automation',
      'Calendar Integration',
      'Priority Support'
    ]
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 999,
    callLimit: 5000,
    effectiveRate: 0.20,
    overageRate: 0.40,
    agentLimit: 999,
    popular: false,
    description: 'For large operations',
    features: [
      'Unlimited AI Agents',
      '5,000 Minutes/Month',
      '~1,000 calls included',
      'Custom Workflows',
      'White-Label Options',
      'Dedicated Account Manager',
      'Custom AI Training'
    ]
  }
];

const FAQ_ITEMS = [
  {
    question: 'Do credits expire?',
    answer: 'No! Credits never expire. Buy once and use them whenever you need, whether that\'s tomorrow or next year.'
  },
  {
    question: 'Can I switch between subscription and credits?',
    answer: 'Yes! You can start with credits and upgrade to a subscription later, or vice versa. You can also use both - subscribe for base usage and buy credit top-ups for busy periods.'
  },
  {
    question: 'What happens if I exceed my subscription minutes?',
    answer: 'Overage charges apply: $0.60/min (Starter), $0.50/min (Professional), $0.40/min (Enterprise). Alternatively, you can purchase credit packages which are much cheaper at $0.05-$0.10 per minute.'
  },
  {
    question: 'How do I know which pricing is best for me?',
    answer: 'Use our pricing calculator above! Generally: if you use less than 300 minutes/month, credits are cheaper. For 500+ minutes with consistent usage, subscriptions offer better value with included features.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! Sign up and get 100 free credits to test all features. No credit card required.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, debit cards, and digital wallets through Stripe\'s secure payment processing.'
  },
  {
    question: 'Can I get a refund?',
    answer: 'Yes! We offer a 30-day money-back guarantee on subscriptions, and unused credits are refundable within 14 days of purchase.'
  },
  {
    question: 'Do you offer annual billing?',
    answer: 'Yes! Contact sales for annual pricing with a 15% discount on all subscription plans.'
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const [pricingMode, setPricingMode] = useState('credits'); // 'credits' or 'subscriptions'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const { data: packagesData } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: () => billingApi.get('/credits/packages').then(res => res.data.data),
  });

  const { data: costs } = useQuery({
    queryKey: ['credit-costs'],
    queryFn: () => billingApi.get('/credits/costs').then(res => res.data.data),
  });

  const packages = packagesData?.packages || {};

  const getIcon = (packageId) => {
    const icons = {
      starter: Zap,
      professional: TrendingUp,
      enterprise: Star,
      mega: Sparkles
    };
    return icons[packageId] || Zap;
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">Simple, Transparent Pricing</Badge>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Choose What Works for You
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Flexible pricing options: pay-as-you-go credits or monthly subscriptions. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Mode Toggle */}
        <div className="flex justify-center mb-12">
          <Tabs value={pricingMode} onValueChange={setPricingMode} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credits">Credit Packages</TabsTrigger>
              <TabsTrigger value="subscriptions">Monthly Plans</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Credit Packages View */}
        {pricingMode === 'credits' && (
          <>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto mb-16">
              {Object.entries(packages).map(([packageId, pkg]) => {
                const Icon = getIcon(packageId);
                return (
                  <Card
                    key={packageId}
                    className={`relative transition-all duration-300 hover:shadow-lg ${
                      pkg.popular ? 'border-primary shadow-md scale-105' : ''
                    }`}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-blue-600">
                        Most Popular
                      </Badge>
                    )}

                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                      <CardDescription className="min-h-[3rem]">{pkg.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold">{formatCurrency(pkg.price)}</div>
                        <div className="text-sm text-muted-foreground mt-2">
                          {pkg.credits.toLocaleString()} credits
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${pkg.pricePerCredit.toFixed(4)} per credit
                        </div>
                        {pkg.savings && (
                          <Badge variant="outline" className="mt-2">
                            Save {pkg.savings}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        {pkg.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className="w-full"
                        size="lg"
                        variant={pkg.popular ? 'default' : 'outline'}
                        onClick={() => navigate(`/checkout?package=${packageId}`)}
                      >
                        Buy Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Subscription Plans View */}
        {pricingMode === 'subscriptions' && (
          <>
            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto mb-16">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const Icon = getIcon(plan.name);
                return (
                  <Card
                    key={plan.name}
                    className={`relative transition-all duration-300 hover:shadow-lg ${
                      plan.popular ? 'border-primary shadow-md scale-105' : ''
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-blue-600">
                        Most Popular
                      </Badge>
                    )}

                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                      <CardDescription className="min-h-[3rem]">{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold">{formatCurrency(plan.price)}</div>
                        <div className="text-sm text-muted-foreground mt-2">per month</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ${plan.effectiveRate.toFixed(3)}/min effective rate
                        </div>
                        <div className="text-xs text-red-500 mt-1">
                          ${plan.overageRate.toFixed(2)}/min overage
                        </div>
                      </div>

                      <div className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className="w-full"
                        size="lg"
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={() => navigate(`/checkout?plan=${plan.name}`)}
                      >
                        Subscribe Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Pricing Calculator */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Calculator className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl">Not Sure Which to Choose?</CardTitle>
              <CardDescription className="text-base">
                Use our calculator to find the best pricing option for your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingCalculator />
            </CardContent>
          </Card>
        </div>

        {/* How Credits Work */}
        {costs && (
          <div className="max-w-4xl mx-auto mb-16">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl">How Credits Work</CardTitle>
                <CardDescription>
                  Credits are deducted based on your usage. Here's what each action costs:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(costs.costs).map(([action, cost]) => (
                    <div key={action} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{cost.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {cost.perMinute && `${cost.perMinute} credit/minute`}
                          {cost.perMessage && `${cost.perMessage} credits/message`}
                          {cost.perEmail && `${cost.perEmail} credits/email`}
                          {cost.perExecution && `${cost.perExecution} credits/execution`}
                          {cost.perInvite && `${cost.perInvite} credits/invite`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Benefits Comparison */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Our Pricing Works for Everyone</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-blue-500/10 rounded-full w-fit">
                  <Zap className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle>Credit Packages</CardTitle>
                <CardDescription>Pay-as-you-go flexibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">7-10x Cheaper Per Minute</div>
                    <div className="text-sm text-muted-foreground">$0.05-$0.10/min vs $0.40-$0.60/min overage</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">No Monthly Commitment</div>
                    <div className="text-sm text-muted-foreground">Perfect for sporadic or project-based work</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Credits Never Expire</div>
                    <div className="text-sm text-muted-foreground">Use them at your own pace</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Minus className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-muted-foreground">Voice calls only</div>
                    <div className="text-sm text-muted-foreground">No CRM or workflow automation</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-purple-500/10 rounded-full w-fit">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
                <CardTitle>Monthly Subscriptions</CardTitle>
                <CardDescription>All-inclusive platform access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Full Platform Access</div>
                    <div className="text-sm text-muted-foreground">CRM, workflows, automation, integrations</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Included Minutes</div>
                    <div className="text-sm text-muted-foreground">200-5,000 minutes depending on plan</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Priority Support</div>
                    <div className="text-sm text-muted-foreground">Dedicated account management</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Minus className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-muted-foreground">Expensive overages</div>
                    <div className="text-sm text-muted-foreground">$0.40-$0.60/min over limit</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-green-500/10 rounded-full w-fit">
                <HelpCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-3xl">Frequently Asked Questions</CardTitle>
              <CardDescription>Everything you need to know about our pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <div key={index} className="border rounded-lg">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">{item.question}</span>
                    <div className={`transform transition-transform ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-4 pb-4 text-muted-foreground">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-blue-600/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">Start with 100 Free Credits</CardTitle>
              <CardDescription className="text-base">
                Sign up today and get 100 credits to try out all features. No credit card required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => navigate('/signup')} className="w-full md:w-auto">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
