import { useState } from 'react';
import { Phone, Zap, TrendingUp, Clock, Briefcase, Home, Wrench, Settings as SettingsIcon, ArrowRight, CheckCircle2, Sparkles, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AgentBuilder from './AgentBuilder';

const VoiceFlowBuilder = () => {
  const [showBuilder, setShowBuilder] = useState(false);

  const benefits = [
    {
      icon: Clock,
      title: "Never Miss a Call",
      description: "AI answers 24/7 while you're in the field",
      color: "blue"
    },
    {
      icon: TrendingUp,
      title: "Book More Jobs",
      description: "AI qualifies leads and books appointments automatically",
      color: "purple"
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "Build, test, and deploy in under 10 minutes",
      color: "green"
    }
  ];

  const industries = [
    { icon: Wrench, label: "Contractors", color: "orange" },
    { icon: Home, label: "Realtors", color: "blue" },
    { icon: Briefcase, label: "Facilities", color: "green" },
    { icon: SettingsIcon, label: "Service Workers", color: "purple" }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-950',
        text: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/50'
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-950',
        text: 'text-purple-600 dark:text-purple-400',
        hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/50'
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-950',
        text: 'text-green-600 dark:text-green-400',
        hover: 'hover:bg-green-50 dark:hover:bg-green-900/50'
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-950',
        text: 'text-orange-600 dark:text-orange-400',
        hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/50'
      }
    };
    return colors[color] || colors.blue;
  };

  if (showBuilder) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setShowBuilder(false)}
          className="mb-4"
        >
          <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
          Back to Overview
        </Button>
        <AgentBuilder />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">AI Voice Agents</h1>
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            For Field Workers
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Spend more time in the field. Let AI handle calls, qualify leads, and grow your business 24/7.
        </p>
      </div>

      {/* Hero CTA Card */}
      <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Ready to build your AI agent?</h2>
              <p className="text-muted-foreground">
                Configure, test, and deploy in under 10 minutes. No coding required.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowBuilder(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="mr-2 h-4 w-4" />
                Build AI Agent
              </Button>
              <Button variant="outline" size="lg">
                <Phone className="mr-2 h-4 w-4" />
                Try Demo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Industries */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Built for Field Workers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {industries.map((industry, index) => {
            const colorClasses = getColorClasses(industry.color);
            return (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center mb-3`}>
                    <industry.icon className={`w-6 h-6 ${colorClasses.text}`} />
                  </div>
                  <h3 className="font-semibold text-sm">{industry.label}</h3>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Benefits */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Why Choose AI Voice Agents?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {benefits.map((benefit, index) => {
            const colorClasses = getColorClasses(benefit.color);
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className={`p-2 rounded-lg ${colorClasses.bg} mr-3`}>
                    <benefit.icon className={`h-5 w-5 ${colorClasses.text}`} />
                  </div>
                  <CardTitle className="text-base">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Build Your AI Agent in 3 Simple Steps</CardTitle>
          <CardDescription>From configuration to deployment in under 10 minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                1
              </div>
              <h3 className="font-semibold mb-2">Configure</h3>
              <p className="text-sm text-muted-foreground">
                Tell us about your business. Choose your AI's personality and what it should say.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                2
              </div>
              <h3 className="font-semibold mb-2">Test</h3>
              <p className="text-sm text-muted-foreground">
                Call your AI agent from your phone. Test it out. Make adjustments until it's perfect.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                3
              </div>
              <h3 className="font-semibold mb-2">Deploy</h3>
              <p className="text-sm text-muted-foreground">
                Click deploy. Your AI is now live, handling calls 24/7 while you work.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Prop */}
      <div className="bg-white rounded-2xl p-12 shadow-lg mb-12">
        <div className="grid grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Focus on What You Do Best
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">You're on a job site</h3>
                  <p className="text-gray-600">AI answers the call, qualifies the lead</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">You're showing a property</h3>
                  <p className="text-gray-600">AI books appointments on your calendar</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">You're at dinner with family</h3>
                  <p className="text-gray-600">AI handles emergency calls professionally</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">You're sleeping</h3>
                  <p className="text-gray-600">AI never misses an opportunity</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8">
            <div className="bg-white rounded-lg p-6 shadow-sm mb-4">
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-500">Incoming Call</span>
              </div>
              <p className="text-gray-900 font-medium">+1 (555) 123-4567</p>
              <p className="text-sm text-gray-600 mt-2">"Hi, I need a plumber for an emergency..."</p>
            </div>
            <div className="bg-indigo-600 text-white rounded-lg p-6">
              <div className="flex items-center mb-2">
                <Zap className="w-5 h-5 mr-2" />
                <span className="text-sm">AI Agent Responding</span>
              </div>
              <p className="text-sm">"I can help you right away! Let me check our availability..."</p>
              <div className="mt-4 pt-4 border-t border-indigo-500">
                <p className="text-xs">✓ Lead qualified</p>
                <p className="text-xs">✓ Appointment booked</p>
                <p className="text-xs">✓ Confirmation sent</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to Let AI Grow Your Business?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Join hundreds of field workers who never miss an opportunity
        </p>
        <button
          onClick={() => setShowBuilder(true)}
          className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
        >
          Start Building Your AI Agent
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default VoiceFlowBuilder;
