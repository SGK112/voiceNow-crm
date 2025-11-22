import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu, Settings, Building2, CreditCard } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header({ isMobileOpen, setIsMobileOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigateToSettings = (tab = 'account') => {
    navigate(`/app/settings?tab=${tab}`);
  };

  return (
    <header className="bg-card border-b border-border px-3 sm:px-4 lg:px-6 py-3 sm:py-3 lg:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-3 lg:gap-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
          >
            <Menu className="h-6 w-6 sm:h-5 sm:w-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-base sm:text-base lg:text-lg font-semibold text-foreground truncate">Welcome back!</h2>
            <p className="text-sm sm:text-sm text-muted-foreground truncate">{user?.company}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2 lg:gap-4 flex-shrink-0">
          {/* User Profile Dropdown - Desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:flex items-center gap-2 hover:bg-accent px-2 py-1.5 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="text-sm text-left">
                  <div className="font-medium text-foreground truncate max-w-[150px]">{user?.email}</div>
                  <div className="text-muted-foreground capitalize">{user?.plan} Plan</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigateToSettings('account')}>
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToSettings('business')}>
                <Building2 className="mr-2 h-4 w-4" />
                <span>Business Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToSettings('billing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing & Plan</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>All Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Profile Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/settings')}
            className="md:hidden hover:bg-accent flex-shrink-0 h-10 w-10"
          >
            <User className="h-5 w-5" />
          </Button>

          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>

          {/* Desktop Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="hidden md:flex hover:bg-accent flex-shrink-0 h-10 w-10 sm:h-9 sm:w-9 lg:h-10 lg:w-10"
          >
            <LogOut className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
