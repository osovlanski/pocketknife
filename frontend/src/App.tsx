/**
 * App Component
 * 
 * Main application component with React Router for deep linking.
 * Uses custom hooks for state management and modular CSS for styling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Mail, Briefcase, Plane, BookOpen, Code, 
  CheckSquare, ShoppingCart, Mountain, Square, Utensils,
  Newspaper, Wrench, MapPin, MessageCircle, PenTool, Building2
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Config
import { API_BASE_URL, SOCKET_URL } from './config';
import logger from './services/logger';

// i18n
import { useTranslation } from './i18n';

// Hooks
import useAuth from './hooks/useAuth';
import useNotification from './hooks/useNotification';
import useSearchController from './hooks/useSearchController';

// Common Components
import { Header, NavTabs, SignInModal } from './components/common';
import { ToastContainer } from './components/common/Toast';

// Page Components
import HomePage from './components/HomePage';
import AdminPanel from './components/AdminPanel';
import SettingsPage from './components/SettingsPage';

// Agent Components
import GmailAgent from './components/GmailAgent';
import JobSearchPanel from './components/JobSearchPanel';
import JobListings from './components/JobListings';
import CompanySearchPanel from './components/CompanySearchPanel';
import MockInterviewPanel from './components/MockInterviewPanel';
import TravelSearchPanel from './components/TravelSearchPanel';
import FlightResults from './components/FlightResults';
import HotelResults from './components/HotelResults';
import TripPlanner from './components/TripPlanner';
import SkiDealsPanel from './components/SkiDealsPanel';
import IsraelTravelPanel from './components/IsraelTravelPanel';
import LearningAgent from './components/LearningAgent';
// ProblemSolvingAgent moved to Jobs > Mock Interview > Coding Practice tab
import ToDoAgent from './components/ToDoAgent';
import ShoppingAgent from './components/ShoppingAgent';
import CookingAgent from './components/CookingAgent';
import NewsAgent from './components/NewsAgent';
import DIYAgent from './components/DIYAgent';
import CanvasTool from './components/CanvasTool';

// Activity Log
import ActivityLog from './components/ActivityLog';

// Services & Types
import { searchTravel, stopTravelSearch, type TravelSearchResponse } from './services/travelApi';
import { getAgentStatus, invalidateCache, type AgentStatus } from './services/configApi';
import type { TravelSearchQuery } from './types/travel';
import type { JobSearchFilters } from './types';
import type { TabConfig } from './components/common/NavTabs';

// Styles
import styles from './styles/layout.module.css';

// =============================================================================
// TYPES
// =============================================================================

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  agent?: string;
}

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

// Agent tabs configuration - labels will be translated in component
const getAgentTabs = (t: (key: string) => string): TabConfig[] => [
  { id: 'email', label: t('nav.email'), icon: Mail, color: 'blue', path: '/agents/email' },
  { id: 'jobs', label: t('nav.jobs'), icon: Briefcase, color: 'purple', path: '/agents/jobs' },
  { id: 'travel', label: t('nav.travel'), icon: Plane, color: 'green', path: '/agents/travel' },
  { id: 'learning', label: t('nav.learning'), icon: BookOpen, color: 'amber', path: '/agents/learning' },
  // Problems/Coding Practice is now part of Jobs > Mock Interview > Coding Practice tab
  { id: 'todo', label: t('nav.todo'), icon: CheckSquare, color: 'emerald', path: '/agents/todo' },
  { id: 'shopping', label: t('nav.shopping'), icon: ShoppingCart, color: 'orange', path: '/agents/shopping' },
  { id: 'cooking', label: t('nav.cooking'), icon: Utensils, color: 'lime', path: '/agents/cooking' },
  { id: 'news', label: t('nav.news'), icon: Newspaper, color: 'red', path: '/agents/news' },
  { id: 'diy', label: t('nav.diy'), icon: Wrench, color: 'amber', path: '/agents/diy' },
  { id: 'canvas', label: t('nav.canvas'), icon: PenTool, color: 'indigo', path: '/tools/canvas' }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getActiveTabFromPath = (pathname: string): string | null => {
  // Check agents routes
  const agentMatch = pathname.match(/^\/agents\/(\w+)/);
  if (agentMatch) return agentMatch[1];
  
  // Check tools routes
  const toolMatch = pathname.match(/^\/tools\/(\w+)/);
  if (toolMatch) return toolMatch[1];
  
  return null;
};

const isAgentRoute = (pathname: string): boolean => {
  return pathname.startsWith('/agents/') || pathname.startsWith('/tools/');
};

// =============================================================================
// AGENT PAGE COMPONENTS (with route-specific layouts)
// =============================================================================

interface AgentLayoutProps {
  title: string;
  subtitle: string;
  gradient: string;
  children: React.ReactNode;
}

const AgentLayout: React.FC<AgentLayoutProps> = ({ title, subtitle, gradient, children }) => (
  <div className="flex flex-col gap-4 sm:gap-6">
    <div className="text-center mb-2 sm:mb-4">
      <h1 
        className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2
                   bg-clip-text text-transparent px-2"
        style={{ backgroundImage: gradient }}
      >
        {title}
      </h1>
      <p className="text-slate-300 text-sm sm:text-base px-4">{subtitle}</p>
    </div>
    {children}
  </div>
);

// =============================================================================
// APP COMPONENT
// =============================================================================

const App: React.FC = () => {
  // ---------------------------------------------------------------------------
  // Router hooks
  // ---------------------------------------------------------------------------
  const location = useLocation();
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Custom hooks
  // ---------------------------------------------------------------------------
  const auth = useAuth();
  const notifications = useNotification();
  const jobSearchController = useSearchController('jobs');
  const { t } = useTranslation();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(() => {
    // Initialize to true if URL has auth=success to prevent flash of logged-out state
    return window.location.search.includes('auth=success');
  });
  
  // Agent enabled status (from admin settings)
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    email: true, jobs: true, travel: true, learning: true,
    problems: true, todo: true, shopping: true, cooking: true,
    news: true, diy: true
  });
  
  // Jobs state
  const [jobs, setJobs] = useState<any[]>([]);
  const [liveMatches, setLiveMatches] = useState<number>(0);
  
  // Travel state
  const [travelResults, setTravelResults] = useState<TravelSearchResponse | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'flights' | 'ski' | 'israel'>('flights');
  
  // Jobs agent mode
  const [jobsMode, setJobsMode] = useState<'search' | 'company' | 'interview'>('search');
  
  // Job search persistent state (preserved across tab switches)
  const [jobCVText, setJobCVText] = useState('');
  const [jobCVData, setJobCVData] = useState<any>(null);
  const [jobLocation, setJobLocation] = useState('');
  const [jobRemoteOnly, setJobRemoteOnly] = useState<boolean | undefined>(false);
  const [jobFilters, setJobFilters] = useState<JobSearchFilters>({
    companySize: 'any',
    companySizes: [],
    industry: 'any',
    industries: [],
    salaryMin: undefined,
    salaryMax: undefined,
    experienceLevel: 'any',
    jobType: 'any'
  });
  
  // Check URL for mode parameter on jobs page
  useEffect(() => {
    if (location.pathname === '/agents/jobs') {
      const params = new URLSearchParams(location.search);
      const mode = params.get('mode');
      if (mode === 'interview') {
        setJobsMode('interview');
      } else if (mode === 'company') {
        setJobsMode('company');
      } else if (mode === 'search') {
        setJobsMode('search');
      }
    }
  }, [location]);

  // Check URL for mode parameter on travel page
  useEffect(() => {
    if (location.pathname === '/agents/travel') {
      const params = new URLSearchParams(location.search);
      const mode = params.get('mode');
      if (mode === 'ski') {
        setTravelMode('ski');
      } else if (mode === 'israel') {
        setTravelMode('israel');
      } else if (mode === 'flights') {
        setTravelMode('flights');
      }
    }
  }, [location]);
  
  // Activity log state
  const [activityLogs, setActivityLogs] = useState<LogEntry[]>([]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------
  const activeTab = getActiveTabFromPath(location.pathname);
  const isOnAgentPage = isAgentRoute(location.pathname);
  const isOnHomePage = location.pathname === '/';

  // Get translated agent tabs
  const agentTabs = getAgentTabs(t);
  
  // Filter agent tabs based on enabled status
  const enabledAgentTabs = agentTabs.filter(tab => 
    agentStatus[tab.id as keyof AgentStatus] !== false
  );

  const tabsWithBadges = enabledAgentTabs.map(tab => {
    if (tab.id === 'jobs') {
      return {
        ...tab,
        badge: jobs.length > 0 ? jobs.length : undefined,
        pulseBadge: liveMatches > 0 && activeTab !== 'jobs' ? liveMatches : undefined
      };
    }
    if (tab.id === 'travel' && travelResults) {
      return {
        ...tab,
        badge: travelResults.flights.length + travelResults.hotels.length
      };
    }
    return tab;
  });

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  
  // Fetch agent enabled status on mount and when navigating back from admin
  useEffect(() => {
    const loadAgentStatus = async () => {
      try {
        const status = await getAgentStatus();
        setAgentStatus(status);
      } catch (error) {
        logger.error('Failed to load agent status', { error });
        // Keep defaults (all enabled) on error
      }
    };
    loadAgentStatus();
    
    // Re-fetch when window regains focus (e.g., after admin changes in another tab)
    const handleFocus = () => {
      loadAgentStatus();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Re-fetch agent status when navigating away from admin panel
  useEffect(() => {
    if (location.pathname !== '/admin') {
      // Just navigated away from admin - invalidate cache and refresh agent status
      invalidateCache();
      getAgentStatus().then(setAgentStatus).catch(err => logger.error('Failed to refresh agent status', { error: err }));
    }
  }, [location.pathname]);

  // Handle Google OAuth callback from URL params
  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const authStatus = urlParams.get('auth');
      const authMessage = urlParams.get('message');
      const authEmail = urlParams.get('email');
      
      if (authStatus === 'success') {
        setIsProcessingOAuth(true);
        
        // Verify the connection actually works by refreshing Google status
        try {
          await auth.refreshGoogleStatus();
          
          // Also sign the user into the app if we have their email
          if (authEmail) {
            logger.info('Google OAuth success, signing in user', { email: authEmail });
            const signInResult = await auth.signIn(authEmail);
            if (signInResult.success) {
              notifications.showSuccess(
                `Welcome, ${authEmail}! Google account connected. You can now use Gmail, Calendar, and Drive features.`
              );
            } else {
              // Google connected but app sign-in failed - show error to user
              logger.error('Google OAuth success but app sign-in failed', { error: signInResult.error });
              notifications.showError(
                `Sign-in failed: ${signInResult.error || 'Unknown error'}. Google is connected, but please try signing in manually.`
              );
            }
          } else {
            notifications.showSuccess(
              'Google account connected successfully! You can now use Gmail, Calendar, and Drive features.'
            );
          }
        } catch (error) {
          logger.error('Google OAuth verification error', { error });
          // Backend said success but verification failed - show warning
          notifications.showWarning(
            'Google authentication completed, but verification failed. Please check Settings → Integrations to confirm connection.'
          );
        } finally {
          setIsProcessingOAuth(false);
        }
        navigate(location.pathname, { replace: true });
      } else if (authStatus === 'error') {
        notifications.showError(
          authMessage || 'Failed to connect Google account. Please try again.'
        );
        navigate(location.pathname, { replace: true });
      }
    };

    if (location.search.includes('auth=')) {
      handleAuthCallback();
    }
  }, [location.search]);

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Listen for real-time job matches
    newSocket.on('job-match', (data: any) => {
      setJobs(prevJobs => {
        const exists = prevJobs.some(j => j.id === data.job.id);
        if (exists) return prevJobs;
        
        const updatedJobs = [...prevJobs, data.job];
        return updatedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      });
      setLiveMatches(prev => prev + 1);
    });

    // Listen for activity logs
    newSocket.on('log', (data: { message: string; type: 'info' | 'success' | 'warning' | 'error'; agent?: string }) => {
      const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        message: data.message,
        type: data.type || 'info',
        agent: data.agent
      };
      setActivityLogs(prevLogs => [...prevLogs, newLog]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSignIn = useCallback(async (email: string) => {
    try {
      logger.debug('Attempting sign in', { email });
      const result = await auth.signIn(email);
      logger.debug('Sign in result', { success: result.success });
      
      if (result.success) {
        notifications.showSuccess(`Welcome back, ${email}!`);
        // Force refresh user state to ensure UI updates
        await auth.refreshUser();
      } else {
        logger.error('Sign in failed', { error: result.error });
        notifications.showError(result.error || 'Sign in failed');
      }
      return result;
    } catch (error: any) {
      logger.error('Sign in exception', { error: error.message });
      notifications.showError('Sign in failed: ' + (error.message || 'Unknown error'));
      return { success: false, error: error.message };
    }
  }, [auth, notifications]);

  const handleSignOut = useCallback(() => {
    auth.signOut();
    navigate('/');
    notifications.showInfo('You have been signed out.');
  }, [auth, notifications, navigate]);

  const handleClearLogs = useCallback(() => {
    setActivityLogs([]);
  }, []);

  const handleCVUploaded = useCallback((data: { filename?: string; skills?: string[] }) => {
    logger.info('CV uploaded', { filename: data?.filename });
  }, []);

  const handleJobSearch = useCallback(async (location?: string, remoteOnly?: boolean, filters?: JobSearchFilters) => {
    const controller = jobSearchController.start();
    
    try {
      setJobs([]);
      setLiveMatches(0);
      
      const response = await fetch(`${API_BASE_URL}/jobs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, remoteOnly, ...filters }),
        signal: controller.signal
      });
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setActivityLogs(prev => [...prev, {
          id: `${Date.now()}`,
          timestamp: new Date(),
          message: '🛑 Search stopped by user',
          type: 'warning'
        }]);
      } else {
        notifications.showError('Error searching for jobs');
      }
    } finally {
      jobSearchController.reset();
    }
  }, [jobSearchController, notifications]);

  const handleStopJobSearch = useCallback(() => {
    jobSearchController.stop();
  }, [jobSearchController]);

  const handleTravelSearch = useCallback(async (query: TravelSearchQuery) => {
    try {
      setTravelLoading(true);
      setTravelError(null);
      setTravelResults(null);
      
      const results = await searchTravel(query);
      setTravelResults(results);
    } catch (error: any) {
      setTravelError(error.message || 'Failed to search travel options');
      notifications.showError('Error searching travel: ' + (error.message || 'Unknown error'));
    } finally {
      setTravelLoading(false);
    }
  }, [notifications]);

  const handleStopTravelSearch = useCallback(async () => {
    try {
      await stopTravelSearch();
      setTravelLoading(false);
    } catch (error) {
      logger.error('Error stopping travel search', { error });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId: string) => {
    const tab = agentTabs.find(t => t.id === tabId);
    if (tab?.path) {
      navigate(tab.path);
    }
  }, [navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={styles.appContainer}>
      {/* Toast Notifications */}
      <ToastContainer 
        notifications={notifications.notifications} 
        onDismiss={notifications.dismissNotification} 
      />

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSignIn={handleSignIn}
      />

      {/* Header */}
      <Header
        user={auth.currentUser}
        isLoading={auth.isLoading || isProcessingOAuth}
        isAdmin={auth.isAdmin}
        activeView={isOnHomePage ? 'home' : (activeTab || location.pathname.slice(1))}
        googleStatus={auth.googleStatus}
        onHomeClick={() => navigate('/')}
        onSettingsClick={() => navigate('/settings')}
        onAdminClick={() => navigate('/admin')}
        onSignInClick={() => setShowSignInModal(true)}
        onSignOut={handleSignOut}
      />

      {/* Agent Navigation Tabs - only show on agent pages */}
      {isOnAgentPage && (
        <NavTabs
          tabs={tabsWithBadges}
          activeTab={activeTab || 'email'}
          onTabChange={handleTabChange}
        />
      )}

      {/* Main Content */}
      <main className={styles.mainContent}>
        <Routes>
          {/* Home Page */}
          <Route path="/" element={
            <HomePage user={auth.currentUser} isAdmin={auth.isAdmin} agentStatus={agentStatus} />
          } />

          {/* Settings */}
          <Route path="/settings" element={
            <SettingsPage user={auth.currentUser} onUserUpdate={auth.refreshUser} />
          } />

          {/* Admin */}
          <Route path="/admin" element={<AdminPanel />} />

          {/* Email Agent */}
          <Route path="/agents/email" element={<GmailAgent />} />
          
          {/* Jobs Agent */}
          <Route path="/agents/jobs" element={
            <AgentLayout
              title={`🤖 ${t('jobs.title')}`}
              subtitle={t('jobs.subtitle')}
              gradient="linear-gradient(to right, rgb(192, 132, 252), rgb(244, 114, 182))"
            >
              {/* Jobs Mode Switcher */}
              <div className="flex justify-center gap-2 mb-4 px-2 flex-wrap">
                <button
                  onClick={() => setJobsMode('search')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5
                             rounded-lg font-semibold text-sm border-none cursor-pointer
                             transition-all duration-200 touch-manipulation active:scale-95
                             ${jobsMode === 'search'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                             }`}
                  aria-pressed={jobsMode === 'search'}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>{t('jobs.jobSearch')}</span>
                </button>
                <button
                  onClick={() => setJobsMode('company')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5
                             rounded-lg font-semibold text-sm border-none cursor-pointer
                             transition-all duration-200 touch-manipulation active:scale-95
                             ${jobsMode === 'company'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                             }`}
                  aria-pressed={jobsMode === 'company'}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Company Search</span>
                </button>
                <button
                  onClick={() => setJobsMode('interview')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5
                             rounded-lg font-semibold text-sm border-none cursor-pointer
                             transition-all duration-200 touch-manipulation active:scale-95
                             ${jobsMode === 'interview'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                             }`}
                  aria-pressed={jobsMode === 'interview'}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t('jobs.mockInterview')}</span>
                </button>
              </div>

              {jobsMode === 'search' ? (
                <>
                  <JobSearchPanel
                    onCVUploaded={handleCVUploaded}
                    onSearch={handleJobSearch}
                    onStop={handleStopJobSearch}
                    isSearching={jobSearchController.state.isSearching}
                    isStopping={jobSearchController.state.isStopping}
                    // Lifted state for persistence across tab switches
                    cvText={jobCVText}
                    onCVTextChange={setJobCVText}
                    cvData={jobCVData}
                    onCVDataChange={setJobCVData}
                    location={jobLocation}
                    onLocationChange={setJobLocation}
                    remoteOnly={jobRemoteOnly}
                    onRemoteOnlyChange={setJobRemoteOnly}
                    filters={jobFilters}
                    onFiltersChange={setJobFilters}
                  />
                  {jobs.length > 0 && <JobListings jobs={jobs} />}
                </>
              ) : jobsMode === 'company' ? (
                <CompanySearchPanel onJobsFound={(foundJobs) => setJobs(foundJobs)} />
              ) : (
                <MockInterviewPanel />
              )}
            </AgentLayout>
          } />

          {/* Travel Agent */}
          <Route path="/agents/travel" element={
            <AgentLayout
              title={`✈️ ${t('travel.title')}`}
              subtitle={t('travel.subtitle')}
              gradient="linear-gradient(to right, rgb(74, 222, 128), rgb(96, 165, 250))"
            >
              {/* Travel Mode Switcher */}
              <div className="flex justify-center gap-2 mb-4 px-2 flex-wrap">
                <button
                  onClick={() => setTravelMode('flights')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 
                             rounded-lg font-semibold text-sm sm:text-base border-none cursor-pointer
                             transition-all duration-200 touch-manipulation active:scale-95
                             ${travelMode === 'flights'
                               ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                               : 'bg-white/10 text-slate-300 hover:bg-white/20'
                             }`}
                >
                  <Plane className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden xs:inline">Flights & Hotels</span>
                  <span className="xs:hidden">Flights</span>
                </button>
                <button
                  onClick={() => setTravelMode('ski')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 
                             rounded-lg font-semibold text-sm sm:text-base border-none cursor-pointer
                             transition-all duration-200 touch-manipulation active:scale-95
                             ${travelMode === 'ski'
                               ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                               : 'bg-white/10 text-slate-300 hover:bg-white/20'
                             }`}
                >
                  <Mountain className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>⛷️ Ski</span>
                </button>
                <button
                  onClick={() => setTravelMode('israel')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 
                             rounded-lg font-semibold text-sm sm:text-base border-none cursor-pointer
                             transition-all duration-200 touch-manipulation active:scale-95
                             ${travelMode === 'israel'
                               ? 'bg-gradient-to-r from-blue-400 via-white to-blue-400 text-blue-900'
                               : 'bg-white/10 text-slate-300 hover:bg-white/20'
                             }`}
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>🇮🇱 Israel</span>
                </button>
              </div>

              {travelMode === 'flights' && (
                <>
                  <div className="relative">
                    <TravelSearchPanel onSearch={handleTravelSearch} loading={travelLoading} />
                    {travelLoading && (
                      <button
                        onClick={handleStopTravelSearch}
                        className="absolute top-2 sm:top-4 right-2 sm:right-4 flex items-center gap-1.5 sm:gap-2 
                                   px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 border border-red-500/50 
                                   rounded-lg text-red-400 cursor-pointer text-sm sm:text-base
                                   hover:bg-red-500/30 transition-colors touch-manipulation"
                      >
                        <Square className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                        Stop
                      </button>
                    )}
                  </div>

                  {travelError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
                      <p className="text-red-400 text-sm sm:text-base">❌ {travelError}</p>
                    </div>
                  )}

                  {travelResults && (
                    <>
                      {travelResults.flights.length > 0 && <FlightResults flights={travelResults.flights} />}
                      {travelResults.hotels.length > 0 && <HotelResults hotels={travelResults.hotels} />}
                      {travelResults.tripPlan && <TripPlanner plan={travelResults.tripPlan} />}
                    </>
                  )}
                </>
              )}
              
              {travelMode === 'ski' && <SkiDealsPanel />}
              
              {travelMode === 'israel' && <IsraelTravelPanel />}
            </AgentLayout>
          } />

          {/* Learning Agent */}
          <Route path="/agents/learning" element={<LearningAgent />} />
          
          {/* Problem Solving Agent - Redirect to Jobs Mock Interview */}
          <Route path="/agents/problems" element={<Navigate to="/agents/jobs?mode=interview" replace />} />

          {/* ToDo Agent */}
          <Route path="/agents/todo" element={<ToDoAgent />} />

          {/* Shopping Agent */}
          <Route path="/agents/shopping" element={<ShoppingAgent />} />

          {/* Cooking Agent */}
          <Route path="/agents/cooking" element={<CookingAgent />} />

          {/* News Agent */}
          <Route path="/agents/news" element={<NewsAgent />} />

          {/* DIY Agent */}
          <Route path="/agents/diy" element={<DIYAgent />} />

          {/* Canvas Tool */}
          <Route path="/tools/canvas" element={
            <AgentLayout
              title="Canvas Tool"
              subtitle="Create visual diagrams and architecture sketches"
              gradient="linear-gradient(to right, #818cf8, #6366f1)"
            >
              <CanvasTool />
            </AgentLayout>
          } />

          {/* Catch-all redirect to home */}
          <Route path="*" element={
            <HomePage user={auth.currentUser} isAdmin={auth.isAdmin} agentStatus={agentStatus} />
          } />
        </Routes>
      </main>
      
      {/* Activity Log - only show on agent pages */}
      {isOnAgentPage && (
        <ActivityLog logs={activityLogs} onClear={handleClearLogs} />
      )}
    </div>
  );
};

export default App;
