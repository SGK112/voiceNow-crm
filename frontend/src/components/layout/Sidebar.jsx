import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Phone, Users, PhoneCall, Workflow, CreditCard, Settings, Target, TrendingUp, CheckSquare, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Voice Agents', href: '/app/agents', icon: Phone },
  { name: 'AI Chat Agents', href: '/app/ai-agents', icon: Bot },
  { name: 'Campaigns', href: '/app/campaigns', icon: Target },
  { name: 'Calls', href: '/app/calls', icon: PhoneCall },
  { name: 'Leads', href: '/app/leads', icon: Users },
  { name: 'Deals', href: '/app/deals', icon: TrendingUp },
  { name: 'Tasks', href: '/app/tasks', icon: CheckSquare },
  { name: 'Workflows', href: '/app/workflows', icon: Workflow },
  { name: 'Billing', href: '/app/billing', icon: CreditCard },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-amber-400 bg-clip-text text-transparent">VoiceFlow</h1>
        <p className="text-sm text-muted-foreground">AI Voice CRM</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
