import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2, MapPin, Phone, ChevronRight, CheckCircle,
  User, Target, MessageSquare, Wand2, Globe, Sparkles
} from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState({
    // Business Information
    businessName: '',
    industry: '',
    businessSize: '',
    website: '',
    timezone: 'America/New_York',

    // Personal Information
    firstName: '',
    lastName: '',
    jobTitle: '',
    phoneNumber: '',

    // Location
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },

    // Use Case & Goals
    primaryUseCase: '',
    targetAudience: '',
    monthlyCallVolume: '',

    // Brand Voice & Messaging
    brandVoice: '',
    companyDescription: '',
    valueProposition: '',
    keyProducts: [],

    // Agent Preferences
    preferredVoiceGender: 'No Preference',
    preferredVoiceAccent: '',
    agentPersonality: '',

    // Integration Preferences
    existingCRM: 'None',
    existingTools: [],

    // AI Context
    aiInstructions: '',
    doNotMention: []
  });

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      // Send to /api/auth/profile endpoint
      return await authApi.put('/profile', { profile: data });
    },
    onSuccess: () => {
      localStorage.setItem('onboardingComplete', 'true');
      navigate('/app/dashboard');
    },
    onError: (error) => {
      alert(`Failed to save profile: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else if (Array.isArray(profileData[field])) {
      // Handle array fields
      const values = value.split(',').map(v => v.trim()).filter(Boolean);
      setProfileData(prev => ({
        ...prev,
        [field]: values
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateStep = (step) => {
    switch(step) {
      case 0:
        return profileData.businessName && profileData.industry;
      case 1:
        return profileData.firstName && profileData.lastName;
      case 2:
        return profileData.address.city && profileData.address.state;
      case 3:
        return profileData.primaryUseCase;
      case 4:
        return true; // Brand voice is optional
      case 5:
        return true; // AI preferences are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      alert('Please fill in all required fields');
      return;
    }

    if (currentStep === steps.length - 1) {
      // Final step - save and complete
      updateProfile.mutate(profileData);
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Save whatever data we have so far
    updateProfile.mutate({
      ...profileData,
      onboardingSkipped: true
    });
  };

  const steps = [
    {
      title: 'Tell us about your business',
      description: 'This helps us personalize your AI agents',
      icon: Building2,
      fields: (
        <>
          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-gray-300">Business Name *</Label>
            <Input
              id="businessName"
              value={profileData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Acme Inc"
              required
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry" className="text-gray-300">Industry *</Label>
            <Select value={profileData.industry} onValueChange={(v) => handleChange('industry', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="E-commerce">E-commerce</SelectItem>
                <SelectItem value="SaaS">SaaS</SelectItem>
                <SelectItem value="Automotive">Automotive</SelectItem>
                <SelectItem value="Home Services">Home Services</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessSize" className="text-gray-300">Company Size</Label>
              <Select value={profileData.businessSize} onValueChange={(v) => handleChange('businessSize', v)}>
                <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-gray-300">Website</Label>
              <Input
                id="website"
                type="url"
                value={profileData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yourcompany.com"
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
        </>
      )
    },
    {
      title: 'Your contact information',
      description: 'Help us personalize your experience',
      icon: User,
      fields: (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
              <Input
                id="firstName"
                value={profileData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                required
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
              <Input
                id="lastName"
                value={profileData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Smith"
                required
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle" className="text-gray-300">Job Title</Label>
            <Input
              id="jobTitle"
              value={profileData.jobTitle}
              onChange={(e) => handleChange('jobTitle', e.target.value)}
              placeholder="CEO, Sales Manager, etc."
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-gray-300">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={profileData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              placeholder="(555) 123-4567"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </>
      )
    },
    {
      title: 'Business location',
      description: 'Agents will use this for context',
      icon: MapPin,
      fields: (
        <>
          <div className="space-y-2">
            <Label htmlFor="street" className="text-gray-300">Street Address</Label>
            <Input
              id="street"
              value={profileData.address.street}
              onChange={(e) => handleChange('address.street', e.target.value)}
              placeholder="123 Main St"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-gray-300">City *</Label>
              <Input
                id="city"
                value={profileData.address.city}
                onChange={(e) => handleChange('address.city', e.target.value)}
                placeholder="Phoenix"
                required
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-gray-300">State *</Label>
              <Input
                id="state"
                value={profileData.address.state}
                onChange={(e) => handleChange('address.state', e.target.value)}
                placeholder="AZ"
                required
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-gray-300">ZIP Code</Label>
              <Input
                id="zipCode"
                value={profileData.address.zipCode}
                onChange={(e) => handleChange('address.zipCode', e.target.value)}
                placeholder="85001"
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-gray-300">Timezone</Label>
              <Select value={profileData.timezone} onValueChange={(v) => handleChange('timezone', v)}>
                <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                  <SelectItem value="America/Phoenix">Arizona (MST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii (HT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )
    },
    {
      title: 'How will you use VoiceFlow?',
      description: 'Tell us your goals so AI can help',
      icon: Target,
      fields: (
        <>
          <div className="space-y-2">
            <Label htmlFor="primaryUseCase" className="text-gray-300">Primary Use Case *</Label>
            <Select value={profileData.primaryUseCase} onValueChange={(v) => handleChange('primaryUseCase', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                <SelectValue placeholder="What's your main goal?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead Qualification">Lead Qualification</SelectItem>
                <SelectItem value="Appointment Setting">Appointment Setting</SelectItem>
                <SelectItem value="Customer Support">Customer Support</SelectItem>
                <SelectItem value="Follow-ups">Follow-ups</SelectItem>
                <SelectItem value="Surveys">Surveys</SelectItem>
                <SelectItem value="Outbound Sales">Outbound Sales</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="text-gray-300">Target Audience</Label>
            <Input
              id="targetAudience"
              value={profileData.targetAudience}
              onChange={(e) => handleChange('targetAudience', e.target.value)}
              placeholder="e.g., homeowners, small businesses, B2B clients"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">Who are you calling or expecting calls from?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyCallVolume" className="text-gray-300">Expected Monthly Call Volume</Label>
            <Select value={profileData.monthlyCallVolume} onValueChange={(v) => handleChange('monthlyCallVolume', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                <SelectValue placeholder="Select call volume" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-100">0-100 calls</SelectItem>
                <SelectItem value="101-500">101-500 calls</SelectItem>
                <SelectItem value="501-1000">501-1,000 calls</SelectItem>
                <SelectItem value="1001-5000">1,001-5,000 calls</SelectItem>
                <SelectItem value="5000+">5,000+ calls</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )
    },
    {
      title: 'Your brand voice',
      description: 'How should your AI agents sound?',
      icon: MessageSquare,
      fields: (
        <>
          <div className="space-y-2">
            <Label htmlFor="brandVoice" className="text-gray-300">Brand Voice Style</Label>
            <Select value={profileData.brandVoice} onValueChange={(v) => handleChange('brandVoice', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                <SelectValue placeholder="Choose a tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Authoritative">Authoritative</SelectItem>
                <SelectItem value="Empathetic">Empathetic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyDescription" className="text-gray-300">Company Description</Label>
            <Textarea
              id="companyDescription"
              value={profileData.companyDescription}
              onChange={(e) => handleChange('companyDescription', e.target.value)}
              placeholder="Briefly describe what your company does..."
              rows={3}
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">AI will use this to understand your business context</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valueProposition" className="text-gray-300">Your Unique Value Proposition</Label>
            <Textarea
              id="valueProposition"
              value={profileData.valueProposition}
              onChange={(e) => handleChange('valueProposition', e.target.value)}
              placeholder="What makes your business stand out from competitors?"
              rows={2}
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyProducts" className="text-gray-300">Key Products/Services (comma-separated)</Label>
            <Input
              id="keyProducts"
              value={profileData.keyProducts.join(', ')}
              onChange={(e) => handleChange('keyProducts', e.target.value)}
              placeholder="Product A, Service B, Package C"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </>
      )
    },
    {
      title: 'AI Agent Preferences',
      description: 'Customize how your agents behave',
      icon: Sparkles,
      fields: (
        <>
          <div className="space-y-2">
            <Label htmlFor="preferredVoiceGender" className="text-gray-300">Preferred Voice Gender</Label>
            <Select value={profileData.preferredVoiceGender} onValueChange={(v) => handleChange('preferredVoiceGender', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="No Preference">No Preference</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentPersonality" className="text-gray-300">Agent Personality</Label>
            <Input
              id="agentPersonality"
              value={profileData.agentPersonality}
              onChange={(e) => handleChange('agentPersonality', e.target.value)}
              placeholder="e.g., professional but warm, energetic and helpful"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiInstructions" className="text-gray-300">Special Instructions for AI (Optional)</Label>
            <Textarea
              id="aiInstructions"
              value={profileData.aiInstructions}
              onChange={(e) => handleChange('aiInstructions', e.target.value)}
              placeholder="Any specific guidelines or requirements for how the AI should behave..."
              rows={3}
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">These instructions will apply to all AI-generated content</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="existingCRM" className="text-gray-300">Existing CRM (if any)</Label>
            <Select value={profileData.existingCRM} onValueChange={(v) => handleChange('existingCRM', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Salesforce">Salesforce</SelectItem>
                <SelectItem value="HubSpot">HubSpot</SelectItem>
                <SelectItem value="Pipedrive">Pipedrive</SelectItem>
                <SelectItem value="Zoho">Zoho</SelectItem>
                <SelectItem value="Close">Close</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-100">
                  You're all set!
                </p>
                <p className="text-sm text-green-300 mt-1">
                  Your profile data will be used throughout VoiceFlow to personalize AI responses, generate better scripts, and provide context-aware assistance. You can update this anytime in Settings.
                </p>
              </div>
            </div>
          </div>
        </>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-3xl bg-[#141416] border-gray-800">
        <CardHeader>
          {/* Optional Setup Notice */}
          <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-sm text-blue-100">
              <strong>Optional Setup:</strong> This information helps personalize your AI agents, but you can skip this and set it up later. Access your profile anytime by clicking your email in the top-right corner.
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Icon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">{currentStepData.title}</CardTitle>
                <CardDescription className="text-gray-400">{currentStepData.description}</CardDescription>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-gray-400 mt-2">
            Step {currentStep + 1} of {steps.length} ({Math.round(progress)}% complete)
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStepData.fields}

          <div className="space-y-4 pt-6 border-t">
            {/* Prominent Skip Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              className="w-full"
              disabled={updateProfile.isPending}
            >
              Skip Setup - Go to Dashboard
            </Button>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4">
              <div>
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                )}
              </div>

              <Button
                onClick={handleNext}
                disabled={updateProfile.isPending}
                className="gap-2"
              >
                {currentStep === steps.length - 1 ? (
                  updateProfile.isPending ? (
                    <>
                      <Wand2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Complete Setup
                    </>
                  )
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-400">
              You can complete your profile later in Settings. The more data you provide, the better AI can assist you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
