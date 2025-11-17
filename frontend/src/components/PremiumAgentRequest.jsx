import { useState } from 'react';
import { Zap, Upload, Check, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * PremiumAgentRequest - Premium Tier Custom Agent Intake Form
 *
 * Comprehensive form for collecting detailed requirements
 * for custom voice agent builds by the VoiceFlow team
 */
const PremiumAgentRequest = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState(null);

  const [formData, setFormData] = useState({
    // Business Information
    business_name: '',
    industry: '',
    industry_other: '',
    business_hours: '',
    timezone: 'PST',
    avg_calls_per_month: '',
    languages: [],

    // Agent Personality
    agent_name: '',
    tone: [],
    speaking_pace: 'moderate',
    voice_gender: 'no_preference',
    accent: 'us',
    accent_other: '',

    // Call Handling
    main_purpose: '',
    questions_to_ask: '',
    information_to_collect: [],
    transfer_conditions: [],

    // Custom Scripts
    opening_greeting_en: '',
    opening_greeting_other: '',
    faqs: [{ question: '', answer: '' }],
    closing_message: '',
    emergency_handling: '',

    // Integrations
    post_call_actions: [],

    // Additional
    sample_call_file: null,
    existing_scripts_file: null,
    special_requirements: ''
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const addFAQ = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }]
    }));
  };

  const updateFAQ = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) =>
        i === index ? { ...faq, [field]: value } : faq
      )
    }));
  };

  const removeFAQ = (index) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (field, event) => {
    const file = event.target.files[0];
    if (file) {
      updateField(field, file);
    }
  };

  const submitRequest = async () => {
    try {
      setSubmitting(true);

      // Create FormData for file uploads
      const formPayload = new FormData();

      // Append all text fields
      Object.keys(formData).forEach(key => {
        if (key === 'sample_call_file' || key === 'existing_scripts_file') {
          if (formData[key]) {
            formPayload.append(key, formData[key]);
          }
        } else if (Array.isArray(formData[key])) {
          formPayload.append(key, JSON.stringify(formData[key]));
        } else if (typeof formData[key] === 'object') {
          formPayload.append(key, JSON.stringify(formData[key]));
        } else {
          formPayload.append(key, formData[key]);
        }
      });

      const response = await axios.post('/api/premium-agent-requests', formPayload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setRequestId(response.data.request_id);
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-2 border-green-500">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Premium Agent Request Submitted!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                We've received your custom agent request
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6 text-left">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Request ID</p>
                    <p className="font-mono font-semibold text-lg">{requestId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estimated Turnaround</p>
                    <p className="font-semibold">2-3 business days</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-left mb-8">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our team will review your requirements and begin building your agent. You'll receive:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Email confirmation shortly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Build updates via dashboard</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Notification when agent is ready</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => navigate('/agents')}
                >
                  View Agent Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Premium Custom Agent Request
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              We'll build your perfect agent - tell us about your business
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">What's included with Premium:</p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                <li>• Custom voice selection optimized for your industry</li>
                <li>• Professionally crafted conversation scripts</li>
                <li>• Industry-specific knowledge and terminology</li>
                <li>• Advanced features (bilingual, urgency detection, etc.)</li>
                <li>• Tested and optimized before delivery</li>
                <li>• 2-3 business day turnaround</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-8">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Business Information</CardTitle>
            <CardDescription>Tell us about your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => updateField('business_name', e.target.value)}
                placeholder="Rodriguez Brothers Roofing"
              />
            </div>

            <div>
              <Label>Industry *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['Construction', 'Field Service', 'Healthcare', 'Real Estate', 'Legal', 'Other'].map(ind => (
                  <div key={ind} className="flex items-center space-x-2">
                    <Checkbox
                      id={`industry-${ind}`}
                      checked={formData.industry === ind.toLowerCase()}
                      onCheckedChange={() => updateField('industry', ind.toLowerCase())}
                    />
                    <label htmlFor={`industry-${ind}`} className="text-sm cursor-pointer">
                      {ind}
                    </label>
                  </div>
                ))}
              </div>
              {formData.industry === 'other' && (
                <Input
                  className="mt-2"
                  placeholder="Specify industry"
                  value={formData.industry_other}
                  onChange={(e) => updateField('industry_other', e.target.value)}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_hours">Business Hours</Label>
                <Input
                  id="business_hours"
                  value={formData.business_hours}
                  onChange={(e) => updateField('business_hours', e.target.value)}
                  placeholder="7 AM - 7 PM"
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={formData.timezone} onValueChange={(val) => updateField('timezone', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PST">PST (Pacific)</SelectItem>
                    <SelectItem value="MST">MST (Mountain)</SelectItem>
                    <SelectItem value="CST">CST (Central)</SelectItem>
                    <SelectItem value="EST">EST (Eastern)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="avg_calls">Average Calls per Month</Label>
              <Input
                id="avg_calls"
                type="number"
                value={formData.avg_calls_per_month}
                onChange={(e) => updateField('avg_calls_per_month', e.target.value)}
                placeholder="400"
              />
            </div>

            <div>
              <Label>Languages</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {['English', 'Spanish', 'French'].map(lang => (
                  <div key={lang} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${lang}`}
                      checked={formData.languages.includes(lang.toLowerCase())}
                      onCheckedChange={() => toggleArrayField('languages', lang.toLowerCase())}
                    />
                    <label htmlFor={`lang-${lang}`} className="text-sm cursor-pointer">
                      {lang}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Personality */}
        <Card>
          <CardHeader>
            <CardTitle>🎭 Agent Personality</CardTitle>
            <CardDescription>Define your agent's voice and character</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="agent_name">Agent Name *</Label>
              <Input
                id="agent_name"
                value={formData.agent_name}
                onChange={(e) => updateField('agent_name', e.target.value)}
                placeholder="Sofia"
              />
              <p className="text-xs text-gray-500 mt-1">What should callers hear?</p>
            </div>

            <div>
              <Label>Tone *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['Professional', 'Friendly', 'Energetic', 'Calm/Reassuring'].map(t => (
                  <div key={t} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tone-${t}`}
                      checked={formData.tone.includes(t.toLowerCase())}
                      onCheckedChange={() => toggleArrayField('tone', t.toLowerCase())}
                    />
                    <label htmlFor={`tone-${t}`} className="text-sm cursor-pointer">
                      {t}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Speaking Pace</Label>
                <Select value={formData.speaking_pace} onValueChange={(val) => updateField('speaking_pace', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="slow">Slow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Voice Gender</Label>
                <Select value={formData.voice_gender} onValueChange={(val) => updateField('voice_gender', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="no_preference">No Preference</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Accent</Label>
                <Select value={formData.accent} onValueChange={(val) => updateField('accent', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">US</SelectItem>
                    <SelectItem value="uk">UK</SelectItem>
                    <SelectItem value="australian">Australian</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Handling */}
        <Card>
          <CardHeader>
            <CardTitle>📞 Call Handling</CardTitle>
            <CardDescription>How should your agent handle conversations?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="main_purpose">What is the main purpose of this agent? *</Label>
              <Textarea
                id="main_purpose"
                value={formData.main_purpose}
                onChange={(e) => updateField('main_purpose', e.target.value)}
                placeholder="Answer calls when we're on job sites, qualify leads, schedule estimates..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="questions_to_ask">What questions should the agent ask?</Label>
              <Textarea
                id="questions_to_ask"
                value={formData.questions_to_ask}
                onChange={(e) => updateField('questions_to_ask', e.target.value)}
                placeholder="1. Type of project&#10;2. Project location&#10;3. Timeline&#10;4. Budget range"
                rows={5}
              />
            </div>

            <div>
              <Label>What information should agent collect?</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['Name', 'Phone', 'Email', 'Address', 'Project Details', 'Budget', 'Timeline'].map(info => (
                  <div key={info} className="flex items-center space-x-2">
                    <Checkbox
                      id={`collect-${info}`}
                      checked={formData.information_to_collect.includes(info.toLowerCase())}
                      onCheckedChange={() => toggleArrayField('information_to_collect', info.toLowerCase())}
                    />
                    <label htmlFor={`collect-${info}`} className="text-sm cursor-pointer">
                      {info}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>When should agent transfer to human?</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['Emergency calls', 'Angry customers', 'Complex questions', 'High-value leads'].map(condition => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      id={`transfer-${condition}`}
                      checked={formData.transfer_conditions.includes(condition.toLowerCase())}
                      onCheckedChange={() => toggleArrayField('transfer_conditions', condition.toLowerCase())}
                    />
                    <label htmlFor={`transfer-${condition}`} className="text-sm cursor-pointer">
                      {condition}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Scripts */}
        <Card>
          <CardHeader>
            <CardTitle>🎤 Custom Scripts</CardTitle>
            <CardDescription>Customize what your agent says</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="opening_greeting">Opening Greeting (English) *</Label>
              <Textarea
                id="opening_greeting"
                value={formData.opening_greeting_en}
                onChange={(e) => updateField('opening_greeting_en', e.target.value)}
                placeholder="Thank you for calling Rodriguez Brothers Roofing, this is Sofia..."
                rows={3}
              />
            </div>

            {formData.languages.length > 1 && (
              <div>
                <Label htmlFor="opening_greeting_other">Opening Greeting (Other Languages)</Label>
                <Textarea
                  id="opening_greeting_other"
                  value={formData.opening_greeting_other}
                  onChange={(e) => updateField('opening_greeting_other', e.target.value)}
                  placeholder="Gracias por llamar a Rodriguez Brothers Roofing..."
                  rows={3}
                />
              </div>
            )}

            <div>
              <Label>Common Questions & Answers</Label>
              <div className="space-y-3 mt-2">
                {formData.faqs.map((faq, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div>
                      <Input
                        placeholder="Question (e.g., Do you offer free estimates?)"
                        value={faq.question}
                        onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                      />
                    </div>
                    <div>
                      <Textarea
                        placeholder="Answer"
                        value={faq.answer}
                        onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                        rows={2}
                      />
                    </div>
                    {formData.faqs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFAQ(index)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addFAQ}>
                  + Add FAQ
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="closing_message">Closing Statement</Label>
              <Textarea
                id="closing_message"
                value={formData.closing_message}
                onChange={(e) => updateField('closing_message', e.target.value)}
                placeholder="Perfect! I've scheduled your estimate. You'll receive a confirmation email shortly..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="emergency_handling">Emergency Handling</Label>
              <Textarea
                id="emergency_handling"
                value={formData.emergency_handling}
                onChange={(e) => updateField('emergency_handling', e.target.value)}
                placeholder="If caller mentions: leak, emergency, urgent..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>🔗 Integrations</CardTitle>
            <CardDescription>What should happen after a call?</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Post-Call Actions</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                'Add lead to CRM',
                'Send email notification',
                'Add to calendar',
                'Send confirmation SMS',
                'Create invoice in QuickBooks',
                'Add to Stripe'
              ].map(action => (
                <div key={action} className="flex items-center space-x-2">
                  <Checkbox
                    id={`action-${action}`}
                    checked={formData.post_call_actions.includes(action.toLowerCase())}
                    onCheckedChange={() => toggleArrayField('post_call_actions', action.toLowerCase())}
                  />
                  <label htmlFor={`action-${action}`} className="text-sm cursor-pointer">
                    {action}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>📎 Additional Information</CardTitle>
            <CardDescription>Help us build the perfect agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sample_call">Upload Sample Call Recording (optional)</Label>
              <Input
                id="sample_call"
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileUpload('sample_call_file', e)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">Help us match your existing style</p>
            </div>

            <div>
              <Label htmlFor="existing_scripts">Upload Existing Scripts (optional)</Label>
              <Input
                id="existing_scripts"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileUpload('existing_scripts_file', e)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="special_requirements">Any special requirements or notes?</Label>
              <Textarea
                id="special_requirements"
                value={formData.special_requirements}
                onChange={(e) => updateField('special_requirements', e.target.value)}
                placeholder="We get a lot of Spanish-speaking callers, would be great if agent could detect and switch..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/agents')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={submitRequest}
            disabled={submitting || !formData.business_name || !formData.agent_name || !formData.main_purpose}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Request
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          ⏱ Typical turnaround: 2-3 business days
        </div>
      </div>
    </div>
  );
};

export default PremiumAgentRequest;
