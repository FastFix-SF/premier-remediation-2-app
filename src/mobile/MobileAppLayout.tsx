// MobileAppLayout - Main layout component for mobile app
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, FolderOpen, MessageCircle, User, Crown, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileHeader } from './components/MobileHeader';
import { MobileTabBar } from './components/MobileTabBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MobileAppGuard } from './components/guards/MobileAppGuard';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { MobileFeedbackButton } from './components/MobileFeedbackButton';

// Wrapper components to delay initialization
const DelayedPushNotifications: React.FC = () => {
  usePushNotifications();
  return null;
};

const DelayedRealtimeNotifications: React.FC = () => {
  useRealtimeNotifications();
  return null;
};

export const MobileAppLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const { data: adminStatus } = useAdminStatus();
  const { t } = useLanguage();
  const [initNotifications, setInitNotifications] = useState(false);
  
  // Delay notifications initialization by 2 seconds to prioritize UI rendering
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setInitNotifications(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const baseTabs = [
    { id: 'home', label: t('nav.home'), icon: Home, path: '/mobile/home' },
    { id: 'projects', label: t('nav.projects'), icon: FolderOpen, path: '/mobile/projects' },
    { id: 'messages', label: t('nav.messages'), icon: MessageCircle, path: '/mobile/messages/chat/general' },
    { id: 'profile', label: t('nav.profile'), icon: User, path: '/mobile/profile' },
  ];

  const adminTab = { 
    id: 'admin', 
    label: t('nav.admin'), 
    icon: Crown, 
    path: '/mobile/admin',
    notificationCount: 14 
  };

  const tabs = adminStatus?.isAdmin ? [...baseTabs, adminTab] : baseTabs;
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're inside a project detail page
  const isProjectDetailPage = /^\/mobile\/projects\/[a-f0-9-]+$/i.test(location.pathname);
  
  const [showTip, setShowTip] = useState(() => {
    const hasSeenTip = localStorage.getItem('hasSeenMobileTip');
    return hasSeenTip !== 'true';
  });

  const dismissTip = () => {
    localStorage.setItem('hasSeenMobileTip', 'true');
    setShowTip(false);
  };

  // Redirect to auth if not logged in (except when already on auth page)
  React.useEffect(() => {
    if (!loading && !user && !location.pathname.startsWith('/mobile/auth')) {
      navigate('/mobile/auth', { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  // Redirect to home tab if on root mobile path
  React.useEffect(() => {
    if (location.pathname === '/mobile' || location.pathname === '/mobile/') {
      navigate('/mobile/home', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Scroll to top on route change
  React.useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  const currentTab = tabs.find(tab => location.pathname.startsWith(tab.path))?.id || 'home';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-lg text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <MobileAppGuard>
      {/* Delayed initialization of notifications */}
      {initNotifications && (
        <>
          <DelayedPushNotifications />
          <DelayedRealtimeNotifications />
        </>
      )}
      
      <div className="flex flex-col h-screen h-[100dvh] bg-background mobile-app layout-lock-mobile overflow-hidden">
        {/* Top App Bar */}
        <MobileHeader />
        
        {/* Offline Indicator */}
        <OfflineIndicator />
        
        {/* Feedback Button */}
        <MobileFeedbackButton />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        
        {/* Bottom Tab Bar - hidden on project detail pages */}
        {!isProjectDetailPage && (
          <MobileTabBar tabs={tabs} currentTab={currentTab} />
        )}
        
        {/* One-time tip */}
        {currentTab === 'projects' && showTip && (
          <div className="fixed bottom-16 xs:bottom-20 left-2 right-2 xs:left-4 xs:right-4 bg-primary text-primary-foreground p-2 xs:p-3 rounded-lg text-xs xs:text-sm shadow-lg z-10 flex items-start justify-between gap-2">
            <span className="flex-1 line-clamp-3">
              📱 {t('mobile.uploadTip')}
            </span>
            <button
              onClick={dismissTip}
              className="flex-shrink-0 p-1 hover:bg-primary-foreground/20 rounded transition-colors touch-target"
              aria-label="Dismiss tip"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </MobileAppGuard>
  );
};