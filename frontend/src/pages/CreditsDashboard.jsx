import { useState, useEffect } from 'react';
import {
  DollarSign, Phone, MessageSquare, Image as ImageIcon,
  TrendingUp, Clock, CreditCard, Zap, Settings,
  ArrowUpRight, ArrowDownRight, Check, AlertCircle
} from 'lucide-react';
import api from '../services/api';

/**
 * Credits Dashboard - Mobile-Optimized
 *
 * Shows:
 * - Current credit balance
 * - Estimated usage (minutes, SMS, MMS)
 * - Quick purchase options
 * - Recent transactions
 * - Usage statistics
 * - Auto-recharge settings
 */

export default function CreditsDashboard() {
  const [credits, setCredits] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [creditsRes, transactionsRes, summaryRes] = await Promise.all([
        api.get('/usage-credits'),
        api.get('/usage-credits/transactions?limit=10'),
        api.get('/usage-credits/summary')
      ]);

      setCredits(creditsRes.data.credit);
      setTransactions(transactionsRes.data.transactions);
      setSummary(summaryRes.data.summary);
    } catch (error) {
      console.error('Error loading credits data:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseCredits = async () => {
    if (purchaseAmount < 5) {
      alert('Minimum purchase is $5');
      return;
    }

    try {
      setPurchasing(true);
      const response = await api.post('/usage-credits/purchase', {
        amount: purchaseAmount
      });

      if (response.data.clientSecret) {
        // TODO: Integrate Stripe payment UI
        alert('Payment integration coming soon. For now, credits added directly for testing.');
      }

      await loadData();
      setShowPurchase(false);
      alert(`$${purchaseAmount} credits added successfully!`);
    } catch (error) {
      console.error('Error purchasing credits:', error);
      alert(error.response?.data?.message || 'Failed to purchase credits');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading credits...</p>
        </div>
      </div>
    );
  }

  const quickAmounts = [5, 10, 20, 50, 100];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-Optimized Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Credits Balance</h1>
          <div className="flex items-baseline gap-2">
            <DollarSign className="h-8 w-8" />
            <span className="text-5xl font-bold">{credits?.balance?.toFixed(2) || '0.00'}</span>
          </div>
          <p className="text-blue-100 mt-2">Available credits</p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {/* Voice Minutes */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <Phone className="h-5 w-5 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {credits?.estimatedMinutes || 0}
            </div>
            <div className="text-xs text-muted-foreground">Voice mins</div>
          </div>

          {/* SMS Count */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <MessageSquare className="h-5 w-5 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {credits?.estimatedSMS || 0}
            </div>
            <div className="text-xs text-muted-foreground">SMS</div>
          </div>

          {/* MMS Count */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <ImageIcon className="h-5 w-5 text-purple-500 mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {credits?.estimatedMMS || 0}
            </div>
            <div className="text-xs text-muted-foreground">MMS</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {/* Low Balance Warning */}
        {credits?.balance < 5 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                Low Balance
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Add credits to continue using voice calls and messaging
              </p>
            </div>
          </div>
        )}

        {/* Purchase Credits Button */}
        {!showPurchase ? (
          <button
            onClick={() => setShowPurchase(true)}
            className="w-full mb-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg transition-all touch-manipulation"
          >
            <CreditCard className="h-5 w-5" />
            Add Credits
          </button>
        ) : (
          <div className="mb-6 p-6 bg-card border border-border rounded-lg">
            <h3 className="font-semibold text-foreground mb-4">Purchase Credits</h3>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setPurchaseAmount(amount)}
                  className={`py-3 rounded-lg font-medium transition-all touch-manipulation ${
                    purchaseAmount === amount
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(Math.max(5, parseInt(e.target.value) || 0))}
                  min="5"
                  max="1000"
                  className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ≈ {Math.floor(purchaseAmount / credits.pricing.voicePerMinute)} voice minutes
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchase(false)}
                className="flex-1 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={purchaseCredits}
                disabled={purchasing || purchaseAmount < 5}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all touch-manipulation"
              >
                {purchasing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Purchase ${purchaseAmount}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Pricing Info */}
        <div className="mb-6 p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Pay-Per-Use Pricing
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Voice Calls</span>
              <span className="font-medium text-foreground">${credits?.pricing.voicePerMinute}/min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SMS Messages</span>
              <span className="font-medium text-foreground">${credits?.pricing.smsPerMessage}/msg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">MMS Messages</span>
              <span className="font-medium text-foreground">${credits?.pricing.mmsPerMessage}/msg</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> Need dedicated numbers? Upgrade to Pro for $12/month with 500 included minutes.
            </p>
          </div>
        </div>

        {/* Usage This Month */}
        {summary && (
          <div className="mb-6 p-4 bg-card border border-border rounded-lg">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Usage This Month
            </h3>
            <div className="space-y-3">
              {summary.voice.count > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{summary.voice.count} calls</div>
                      <div className="text-xs text-muted-foreground">{summary.voice.totalMinutes} minutes</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">${summary.voice.totalAmount.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {summary.sms.count > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{summary.sms.count} SMS</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">${summary.sms.totalAmount.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {summary.mms.count > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{summary.mms.count} MMS</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">${summary.mms.totalAmount.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {summary.total.count === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No usage this month yet
                </p>
              )}

              {summary.total.count > 0 && (
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total Spent</span>
                  <span className="font-bold text-lg text-foreground">${summary.total.totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Recent Activity
          </h3>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions yet
              </p>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => (
                  <div key={tx._id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {tx.type === 'voice' && <Phone className="h-4 w-4 text-blue-500" />}
                        {tx.type === 'sms' && <MessageSquare className="h-4 w-4 text-green-500" />}
                        {tx.type === 'mms' && <ImageIcon className="h-4 w-4 text-purple-500" />}
                        {tx.type === 'credit_purchase' && <ArrowDownRight className="h-4 w-4 text-green-500" />}
                        {tx.type === 'credit_refund' && <ArrowUpRight className="h-4 w-4 text-red-500" />}

                        <div>
                          <div className="font-medium text-sm text-foreground">
                            {tx.type === 'voice' && `Call - ${tx.durationMinutes || 0} min`}
                            {tx.type === 'sms' && 'SMS Message'}
                            {tx.type === 'mms' && 'MMS Message'}
                            {tx.type === 'credit_purchase' && 'Credits Purchased'}
                            {tx.type === 'credit_refund' && 'Credits Refunded'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-medium text-sm ${
                          tx.type === 'credit_purchase' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'credit_purchase' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${tx.balanceAfter.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auto-Recharge Settings */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-foreground">Auto-Recharge</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={credits?.autoRecharge?.enabled || false}
                onChange={async (e) => {
                  try {
                    await api.patch('/usage-credits/auto-recharge', {
                      enabled: e.target.checked
                    });
                    await loadData();
                  } catch (error) {
                    console.error('Error updating auto-recharge:', error);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically add ${credits?.autoRecharge?.amount || 20} when balance drops below ${credits?.autoRecharge?.threshold || 5}
          </p>
        </div>
      </div>
    </div>
  );
}
