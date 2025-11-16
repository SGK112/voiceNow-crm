import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Phone, Users, PhoneCall, Workflow, CreditCard, Settings, Target, TrendingUp, CheckSquare, Bot, Plug, Calendar, FileText, ChevronLeft, ChevronRight, X, Activity, Briefcase, Library, Sparkles, ShoppingBag, DollarSign, MessageSquare, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

// Core sections - Voice Workflow CRM focused navigation
const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, tourId: 'dashboard', description: 'Analytics & Overview' },
  { name: 'Voice Agents', href: '/app/agents', icon: Bot, tourId: 'agents', description: 'AI Voice Agent Builder' },
  { name: 'Workflows', href: '/app/workflows', icon: Workflow, tourId: 'workflows', description: 'Visual Workflow Automation' },
  { name: 'CRM', href: '/app/crm', icon: Users, tourId: 'crm', description: 'Leads & Deals Management' },
  { name: 'Marketplace', href: '/app/marketplace', icon: Store, tourId: 'marketplace', description: 'Templates & Integrations' },
  { name: 'Settings', href: '/app/settings', icon: Settings, tourId: 'settings', description: 'Integrations & Configuration' },
];

// Legacy routes for backwards compatibility (redirects handled in routes)
const legacyNavigationMap = {
  '/app/dashboard': '/app/crm',
  '/app/leads': '/app/crm',
  '/app/business': '/app/crm',
  '/app/messages': '/app/crm',
  '/app/tasks': '/app/crm',
  '/app/campaigns': '/app/crm',
  '/app/conversations': '/app/agents',
  '/app/phone-numbers': '/app/settings',
};

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, [setIsCollapsed]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out',
          'fixed lg:relative inset-y-0 left-0 z-50',
          isCollapsed ? 'w-20' : 'w-64',
          // Mobile: slide in from left
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className={cn(
          'border-b border-border flex items-center justify-between transition-all duration-300 relative',
          isCollapsed ? 'p-4 lg:p-4' : 'p-4 lg:p-6'
        )}>
          <div className={cn(
            'overflow-hidden transition-all duration-300 flex flex-col items-center lg:items-start w-full',
            isCollapsed ? 'w-0 opacity-0' : 'opacity-100'
          )}>
            <h1 className="text-xl sm:text-xl lg:text-2xl font-bold whitespace-nowrap flex items-center gap-2">
              <span className="text-2xl">🎙️</span>
              <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Remodely.ai</span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap mt-0.5">VoiceFlow CRM</p>
          </div>

          {isCollapsed && (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-2xl shadow-md">
              🎙️
            </div>
          )}

          {/* Desktop Collapse Toggle - Top Right */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 items-center justify-center bg-card border border-border rounded-full hover:bg-accent transition-all shadow-sm hover:shadow-md z-10"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                data-tour={item.tourId}
                className={cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-all relative group',
                  isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn('flex-shrink-0', isCollapsed ? 'h-5 w-5' : 'h-5 w-5')} />
                <span className={cn(
                  'transition-all duration-300 whitespace-nowrap',
                  isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
                )}>
                  {item.name}
                </span>

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover" />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
