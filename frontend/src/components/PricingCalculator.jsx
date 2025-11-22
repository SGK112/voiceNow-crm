import { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

const CREDIT_PACKAGES = [
  { name: 'Starter Pack', credits: 500, price: 49, pricePerCredit: 0.098 },
  { name: 'Professional Pack', credits: 2000, price: 149, pricePerCredit: 0.0745 },
  { name: 'Enterprise Pack', credits: 5000, price: 299, pricePerCredit: 0.0598 },
  { name: 'Mega Pack', credits: 10000, price: 499, pricePerCredit: 0.0499 }
];

const SUBSCRIPTION_PLANS = [
  { name: 'Starter', price: 99, minutes: 200, overageRate: 0.60 },
  { name: 'Professional', price: 299, minutes: 1000, overageRate: 0.50 },
  { name: 'Enterprise', price: 999, minutes: 5000, overageRate: 0.40 }
];

export default function PricingCalculator() {
  const [monthlyMinutes, setMonthlyMinutes] = useState(500);

  const calculations = useMemo(() => {
    // Calculate credit costs
    const creditsNeeded = monthlyMinutes;

    // Find best credit package
    let bestCreditPackage = CREDIT_PACKAGES[0];
    for (const pkg of CREDIT_PACKAGES) {
      if (pkg.credits >= creditsNeeded) {
        bestCreditPackage = pkg;
        break;
      }
    }

    // If usage exceeds largest package, calculate based on largest package rate
    const creditCost = creditsNeeded <= 10000
      ? bestCreditPackage.price
      : (creditsNeeded * CREDIT_PACKAGES[3].pricePerCredit);

    // Calculate subscription costs
    const subscriptionCosts = SUBSCRIPTION_PLANS.map(plan => {
      if (monthlyMinutes <= plan.minutes) {
        return { ...plan, totalCost: plan.price, overage: 0 };
      } else {
        const overageMinutes = monthlyMinutes - plan.minutes;
        const overageCost = overageMinutes * plan.overageRate;
        return { ...plan, totalCost: plan.price + overageCost, overage: overageCost };
      }
    });

    // Find best subscription
    const bestSubscription = subscriptionCosts.reduce((best, current) =>
      current.totalCost < best.totalCost ? current : best
    );

    // Determine recommendation
    let recommendation;
    let savingsAmount;
    let savingsPercent;

    if (creditCost < bestSubscription.totalCost) {
      recommendation = 'credits';
      savingsAmount = bestSubscription.totalCost - creditCost;
      savingsPercent = ((savingsAmount / bestSubscription.totalCost) * 100).toFixed(0);
    } else {
      recommendation = 'subscription';
      savingsAmount = creditCost - bestSubscription.totalCost;
      savingsPercent = ((savingsAmount / creditCost) * 100).toFixed(0);
    }

    return {
      creditCost,
      bestCreditPackage,
      subscriptionCosts,
      bestSubscription,
      recommendation,
      savingsAmount,
      savingsPercent
    };
  }, [monthlyMinutes]);

  return (
    <div className="space-y-8">
      {/* Slider Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Expected Monthly Minutes</label>
          <div className="text-2xl font-bold text-primary">{monthlyMinutes}</div>
        </div>
        <Slider
          value={[monthlyMinutes]}
          onValueChange={(value) => setMonthlyMinutes(value[0])}
          min={50}
          max={10000}
          step={50}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>50 min</span>
          <span>10,000 min</span>
        </div>
      </div>

      {/* Recommendation Badge */}
      <div className="flex justify-center">
        <Badge className="text-lg py-2 px-6 bg-gradient-to-r from-primary to-blue-600">
          {calculations.recommendation === 'credits' ? (
            <>
              <TrendingDown className="mr-2 h-5 w-5" />
              Credit Packages Recommended - Save {calculations.savingsPercent}%
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-5 w-5" />
              Subscription Recommended - Save {calculations.savingsPercent}%
            </>
          )}
        </Badge>
      </div>

      {/* Cost Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Credit Package Option */}
        <Card className={`border-2 ${calculations.recommendation === 'credits' ? 'border-primary shadow-lg' : 'border-muted'}`}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Credit Package</h3>
              {calculations.recommendation === 'credits' && (
                <Badge variant="default">Best Value</Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Package</span>
                <span className="font-medium">{calculations.bestCreditPackage.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Credits</span>
                <span className="font-medium">{calculations.bestCreditPackage.credits.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rate</span>
                <span className="font-medium">${calculations.bestCreditPackage.pricePerCredit.toFixed(4)}/credit</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">One-time Cost</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    ${calculations.creditCost.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    (lasts {Math.floor(calculations.bestCreditPackage.credits / monthlyMinutes)} months)
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                ✓ Credits never expire
              </div>
              <div className="flex items-center gap-1">
                ✓ No monthly commitment
              </div>
              <div className="flex items-center gap-1">
                ✓ Voice calls only
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Option */}
        <Card className={`border-2 ${calculations.recommendation === 'subscription' ? 'border-primary shadow-lg' : 'border-muted'}`}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Subscription</h3>
              {calculations.recommendation === 'subscription' && (
                <Badge variant="default">Best Value</Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="font-medium">{calculations.bestSubscription.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Included Minutes</span>
                <span className="font-medium">{calculations.bestSubscription.minutes.toLocaleString()}</span>
              </div>
              {calculations.bestSubscription.overage > 0 && (
                <>
                  <div className="flex items-center justify-between text-red-600">
                    <span className="text-sm">Overage</span>
                    <span className="font-medium">${calculations.bestSubscription.overage.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-red-600 text-xs">
                    <span>{monthlyMinutes - calculations.bestSubscription.minutes} min over</span>
                    <span>${calculations.bestSubscription.overageRate.toFixed(2)}/min</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Monthly Cost</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    ${calculations.bestSubscription.totalCost.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    per month
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                ✓ Full CRM access
              </div>
              <div className="flex items-center gap-1">
                ✓ Workflow automation
              </div>
              <div className="flex items-center gap-1">
                ✓ Priority support
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-full">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="font-semibold">
                {calculations.recommendation === 'credits'
                  ? `Save $${calculations.savingsAmount.toFixed(2)}/month with Credit Packages`
                  : `Save $${calculations.savingsAmount.toFixed(2)} with ${calculations.bestSubscription.name} Subscription`
                }
              </div>
              <div className="text-sm text-muted-foreground">
                {calculations.recommendation === 'credits'
                  ? `Credits are ${calculations.savingsPercent}% cheaper for your usage level`
                  : `Subscriptions include CRM, workflows, and support - better value for ${monthlyMinutes} minutes/month`
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Context */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>
          💡 <strong>Tip:</strong> {monthlyMinutes < 300
            ? 'For sporadic usage, credits are usually more cost-effective.'
            : monthlyMinutes < 800
            ? 'Consider credits for flexibility or subscriptions for full platform access.'
            : 'For high volume, subscriptions include CRM features that justify the cost.'
          }
        </p>
        <p className="text-xs">
          You can combine both: use a subscription for base usage and buy credits for overflow periods.
        </p>
      </div>
    </div>
  );
}
