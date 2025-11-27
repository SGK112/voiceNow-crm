import { useState, useEffect } from 'react';
import {
  Phone, Search, ShoppingCart, Download, Upload,
  DollarSign, MessageSquare, PhoneCall, Check,
  Filter, MapPin, Globe, Star, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/services/api';

/**
 * PhoneNumberMarketplace - Buy, Port, and Manage Phone Numbers
 *
 * Features:
 * - Search and purchase new numbers (local, toll-free, international)
 * - Port existing numbers
 * - Manage owned numbers
 * - SMS/MMS services
 * - Voice agent assignment
 */
const PhoneNumberMarketplace = () => {
  const [searchType, setSearchType] = useState('local'); // local, tollfree, international
  const [searchParams, setSearchParams] = useState({
    areaCode: '',
    country: 'US',
    contains: '',
    capabilities: ['voice', 'sms']
  });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [myNumbers, setMyNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState([]);

  useEffect(() => {
    loadMyNumbers();
  }, []);

  const loadMyNumbers = async () => {
    try {
      const response = await api.get('/phone-numbers/my-numbers');
      setMyNumbers(response.data.numbers || []);
    } catch (error) {
      console.error('Error loading numbers:', error);
    }
  };

  const searchNumbers = async () => {
    try {
      setLoading(true);
      const response = await api.post('/phone-numbers/search', {
        type: searchType,
        ...searchParams
      });
      setAvailableNumbers(response.data.numbers || []);
    } catch (error) {
      console.error('Error searching numbers:', error);
      alert('Failed to search numbers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const purchaseNumber = async (phoneNumber) => {
    if (!confirm(`Purchase ${phoneNumber} for $12/month? (Includes 500 mins, $0.05/min overage)`)) return;

    try {
      setLoading(true);
      const response = await api.post('/phone-numbers/purchase', {
        phoneNumber
      });

      if (response.data.success) {
        alert(`Successfully purchased ${phoneNumber}!`);
        loadMyNumbers();
        // Remove from available numbers
        setAvailableNumbers(prev => prev.filter(n => n.phoneNumber !== phoneNumber));
      }
    } catch (error) {
      console.error('Error purchasing number:', error);
      alert(error.response?.data?.message || 'Failed to purchase number');
    } finally {
      setLoading(false);
    }
  };

  const bulkPurchase = async () => {
    if (selectedNumbers.length === 0) {
      alert('Please select numbers to purchase');
      return;
    }

    const total = selectedNumbers.length * 1.00;
    if (!confirm(`Purchase ${selectedNumbers.length} numbers for $${total.toFixed(2)}/month?`)) return;

    try {
      setLoading(true);
      const response = await api.post('/phone-numbers/bulk-purchase', {
        phoneNumbers: selectedNumbers
      });

      if (response.data.success) {
        alert(`Successfully purchased ${selectedNumbers.length} numbers!`);
        setSelectedNumbers([]);
        loadMyNumbers();
        setAvailableNumbers(prev =>
          prev.filter(n => !selectedNumbers.includes(n.phoneNumber))
        );
      }
    } catch (error) {
      console.error('Error purchasing numbers:', error);
      alert(error.response?.data?.message || 'Failed to purchase numbers');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (number) => {
    // Format: +1 (555) 123-4567
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  const toggleNumberSelection = (phoneNumber) => {
    setSelectedNumbers(prev =>
      prev.includes(phoneNumber)
        ? prev.filter(n => n !== phoneNumber)
        : [...prev, phoneNumber]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-foreground">
              Phone Number Marketplace
            </h1>
            <p className="text-gray-800 text-foreground">
              Buy local, toll-free, and international numbers • Port existing numbers • Manage SMS/Voice services
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="buy" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="buy">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy Numbers
          </TabsTrigger>
          <TabsTrigger value="port">
            <Upload className="w-4 h-4 mr-2" />
            Port Number
          </TabsTrigger>
          <TabsTrigger value="my-numbers">
            <Phone className="w-4 h-4 mr-2" />
            My Numbers ({myNumbers.length})
          </TabsTrigger>
        </TabsList>

        {/* Buy Numbers Tab */}
        <TabsContent value="buy" className="space-y-6">
          {/* Search Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Search Available Numbers</CardTitle>
              <CardDescription>Find the perfect phone number for your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Number Type Selection */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'local', icon: MapPin, label: 'Local Numbers', desc: 'Area code based' },
                  { value: 'tollfree', icon: Star, label: 'Toll-Free', desc: '1-800, 1-888, etc.' },
                  { value: 'international', icon: Globe, label: 'International', desc: '100+ countries' }
                ].map(type => (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all ${
                      searchType === type.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => setSearchType(type.value)}
                  >
                    <CardContent className="p-4">
                      <type.icon className={`w-6 h-6 mb-2 ${
                        searchType === type.value ? 'text-green-600' : 'text-gray-600'
                      }`} />
                      <p className="font-semibold text-sm">{type.label}</p>
                      <p className="text-xs text-gray-500">{type.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Search Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {searchType === 'local' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Area Code</label>
                    <Input
                      placeholder="e.g., 555"
                      value={searchParams.areaCode}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, areaCode: e.target.value }))}
                      maxLength={3}
                    />
                  </div>
                )}

                {searchType === 'international' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Country</label>
                    <Select
                      value={searchParams.country}
                      onValueChange={(value) => setSearchParams(prev => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">🇺🇸 United States</SelectItem>
                        <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                        <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                        <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                        <SelectItem value="MX">🇲🇽 Mexico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Contains (Optional)</label>
                  <Input
                    placeholder="e.g., 1234"
                    value={searchParams.contains}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, contains: e.target.value }))}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={searchNumbers}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? 'Searching...' : 'Search Numbers'}
                  </Button>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <label className="block text-sm font-medium mb-2">Required Capabilities</label>
                <div className="flex gap-3">
                  {[
                    { key: 'voice', label: 'Voice Calls', icon: PhoneCall },
                    { key: 'sms', label: 'SMS', icon: MessageSquare },
                    { key: 'mms', label: 'MMS', icon: Download }
                  ].map(cap => (
                    <label key={cap.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchParams.capabilities.includes(cap.key)}
                        onChange={(e) => {
                          setSearchParams(prev => ({
                            ...prev,
                            capabilities: e.target.checked
                              ? [...prev.capabilities, cap.key]
                              : prev.capabilities.filter(c => c !== cap.key)
                          }));
                        }}
                        className="rounded"
                      />
                      <cap.icon className="w-4 h-4" />
                      <span className="text-sm">{cap.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Numbers */}
          {availableNumbers.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Numbers ({availableNumbers.length})</CardTitle>
                    <CardDescription>
                      Select numbers to purchase • $1.00/month per number
                    </CardDescription>
                  </div>
                  {selectedNumbers.length > 0 && (
                    <Button onClick={bulkPurchase} disabled={loading}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Purchase {selectedNumbers.length} Numbers (${(selectedNumbers.length * 1.00).toFixed(2)}/mo)
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableNumbers.map((number) => (
                    <div
                      key={number.phoneNumber}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedNumbers.includes(number.phoneNumber)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => toggleNumberSelection(number.phoneNumber)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-5 h-5 text-green-600" />
                          <p className="font-mono font-semibold text-lg">
                            {formatPhoneNumber(number.phoneNumber)}
                          </p>
                        </div>
                        {selectedNumbers.includes(number.phoneNumber) && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {number.locality || number.region}
                        </Badge>
                        {number.capabilities?.voice && (
                          <Badge variant="secondary" className="text-xs">Voice</Badge>
                        )}
                        {number.capabilities?.SMS && (
                          <Badge variant="secondary" className="text-xs">SMS</Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-800 text-foreground">
                          ${number.price || '1.00'}/month
                        </span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            purchaseNumber(number.phoneNumber);
                          }}
                          disabled={loading}
                        >
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Port Number Tab */}
        <TabsContent value="port">
          <Card>
            <CardHeader>
              <CardTitle>Port Your Existing Number</CardTitle>
              <CardDescription>
                Transfer your current phone number to VoiceNow CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                      Number Porting Process
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Submit porting request with current carrier info</li>
                      <li>• Verify ownership (LOA required)</li>
                      <li>• Processing typically takes 7-10 business days</li>
                      <li>• No downtime - seamless transfer</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number to Port *</label>
                  <Input placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Current Carrier *</label>
                  <Input placeholder="e.g., AT&T, Verizon" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Account Number *</label>
                  <Input placeholder="Your account number with current carrier" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">PIN/Passcode</label>
                  <Input type="password" placeholder="If required by carrier" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Letter of Authorization (LOA)
                </label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-600 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-gray-800 text-foreground mb-2">
                    Upload signed LOA document
                  </p>
                  <Button variant="outline">Choose File</Button>
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                Submit Porting Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Numbers Tab */}
        <TabsContent value="my-numbers">
          <Card>
            <CardHeader>
              <CardTitle>My Phone Numbers</CardTitle>
              <CardDescription>Manage your purchased and ported numbers</CardDescription>
            </CardHeader>
            <CardContent>
              {myNumbers.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="w-16 h-16 text-gray-600 text-muted-foreground mx-auto mb-4" />
                  <p className="text-gray-800 text-foreground mb-4">
                    You don't have any phone numbers yet
                  </p>
                  <Button onClick={() => document.querySelector('[value="buy"]').click()}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Your First Number
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myNumbers.map((number) => (
                    <div
                      key={number.sid}
                      className="border rounded-lg p-4 hover:bg-secondary/50 dark:hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-lg">
                              {formatPhoneNumber(number.phoneNumber)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{number.friendlyName}</Badge>
                              {number.capabilities?.voice && <Badge variant="secondary">Voice</Badge>}
                              {number.capabilities?.SMS && <Badge variant="secondary">SMS</Badge>}
                              {number.capabilities?.MMS && <Badge variant="secondary">MMS</Badge>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            Release
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PhoneNumberMarketplace;
