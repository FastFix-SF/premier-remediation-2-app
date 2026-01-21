import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from './chat/NotificationBadge';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  notificationCount?: number;
}

interface MobileTabBarProps {
  tabs: Tab[];
  currentTab: string;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ tabs, currentTab }) => {
  const navigate = useNavigate();

  return (
    <nav className="app-bottom-bar flex items-center justify-around py-2 px-1 xs:px-2 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        
        return (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => navigate(tab.path)}
            className={`relative flex flex-col items-center gap-0.5 xs:gap-1 min-h-[52px] xs:min-h-14 px-2 xs:px-3 rounded-xl transition-all duration-200 flex-shrink-0 ${
              isActive 
                ? 'text-primary bg-primary/15 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5 xs:w-6 xs:h-6" />
              {tab.notificationCount && tab.notificationCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 xs:-top-2 xs:-right-2">
                  <NotificationBadge count={tab.notificationCount} />
                </div>
              )}
            </div>
            <span className="text-[10px] xs:text-xs font-semibold truncate max-w-[52px] xs:max-w-[64px]">{tab.label}</span>
          </Button>
        );
      })}
    </nav>
  );
};