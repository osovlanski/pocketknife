/**
 * HomePage Component
 * 
 * Landing page with agent overview and quick actions.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, Briefcase, Plane, BookOpen, Code, 
  CheckSquare, ShoppingCart, ArrowRight, Sparkles,
  Zap, Shield, Settings, Utensils, Newspaper, Hammer, Bot
} from 'lucide-react';
import type { CurrentUser } from '../services/authApi';
import type { AgentStatus } from '../services/configApi';

interface AgentCard {
  id: string;
  name: string;
  description: string;
  icon: React.FC<any>;
  path: string;
  gradient: string;
  features: string[];
}

const agents: AgentCard[] = [
  {
    id: 'assistant',
    name: '🤖 AI Assistant',
    description: 'Your intelligent orchestrator that can access all agents. Just ask in natural language!',
    icon: Bot,
    path: '/agents/assistant',
    gradient: 'from-violet-500 to-purple-600',
    features: ['Natural language', 'Multi-agent access', 'Smart suggestions']
  },
  {
    id: 'email',
    name: 'Email Agent',
    description: 'Intelligent email management with AI-powered categorization and smart replies.',
    icon: Mail,
    path: '/agents/email',
    gradient: 'from-blue-500 to-indigo-600',
    features: ['Smart inbox sorting', 'Invoice extraction', 'Auto-replies']
  },
  {
    id: 'jobs',
    name: 'Jobs Agent',
    description: 'AI-powered job search that matches your CV with the best opportunities.',
    icon: Briefcase,
    path: '/agents/jobs',
    gradient: 'from-purple-500 to-pink-600',
    features: ['CV analysis', 'Real-time matching', 'Multi-platform search']
  },
  {
    id: 'travel',
    name: 'Travel Agent',
    description: 'Find the best flights, hotels, and ski deals with intelligent price tracking.',
    icon: Plane,
    path: '/agents/travel',
    gradient: 'from-emerald-500 to-teal-600',
    features: ['Flight deals', 'Hotel search', 'Ski packages']
  },
  {
    id: 'learning',
    name: 'Learning Agent',
    description: 'Personalized learning paths for programming and technical skills.',
    icon: BookOpen,
    path: '/agents/learning',
    gradient: 'from-amber-500 to-orange-600',
    features: ['Curated resources', 'Progress tracking', 'Skill paths']
  },
  {
    id: 'problems',
    name: 'Problem Solving',
    description: 'Practice coding challenges with AI hints and solution explanations.',
    icon: Code,
    path: '/agents/problems',
    gradient: 'from-cyan-500 to-blue-600',
    features: ['LeetCode prep', 'AI hints', 'Multiple languages']
  },
  {
    id: 'todo',
    name: 'ToDo Agent',
    description: 'Smart task management that learns your routines and integrates with Calendar.',
    icon: CheckSquare,
    path: '/agents/todo',
    gradient: 'from-green-500 to-emerald-600',
    features: ['Routine learning', 'Calendar sync', 'Smart scheduling']
  },
  {
    id: 'shopping',
    name: 'Shopping Agent',
    description: 'Find the best deals across multiple platforms with AI-powered price alerts.',
    icon: ShoppingCart,
    path: '/agents/shopping',
    gradient: 'from-rose-500 to-red-600',
    features: ['Deal scoring', 'Price alerts', 'Multi-platform']
  },
  {
    id: 'cooking',
    name: 'Cooking Agent',
    description: 'Manage your kitchen inventory, create shopping lists, discover recipes, and save dishes to your wishlist.',
    icon: Utensils,
    path: '/agents/cooking',
    gradient: 'from-lime-500 to-green-600',
    features: ['Inventory tracking', 'Recipe wishlist', 'Dish images']
  },
  {
    id: 'news',
    name: 'News Agent',
    description: 'Personalized daily/weekly news digest that learns your preferences and surfaces relevant stories.',
    icon: Newspaper,
    path: '/agents/news',
    gradient: 'from-red-500 to-orange-600',
    features: ['Smart personalization', 'Topic learning', 'Geo-local news']
  },
  {
    id: 'diy',
    name: 'DIY Agent',
    description: 'Step-by-step guides for DIY projects with material lists and shopping integration.',
    icon: Hammer,
    path: '/agents/diy',
    gradient: 'from-amber-500 to-yellow-600',
    features: ['Project guides', 'Material lists', 'Shopping links']
  }
];

interface HomePageProps {
  user: CurrentUser | null;
  isAdmin: boolean;
  agentStatus?: AgentStatus;
}

const HomePage: React.FC<HomePageProps> = ({ user, isAdmin, agentStatus }) => {
  // Filter agents based on enabled status
  const enabledAgents = agents.filter(agent => 
    !agentStatus || agentStatus[agent.id as keyof AgentStatus] !== false
  );
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-8 sm:py-12 md:py-16 text-center">
        {/* Animated background elements - hidden on very small screens for performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
          <div 
            className="absolute top-[10%] left-[10%] w-48 sm:w-72 md:w-80 aspect-square 
                       bg-purple-500/15 rounded-full blur-3xl animate-pulse"
          />
          <div 
            className="absolute bottom-[20%] right-[15%] w-40 sm:w-60 md:w-64 aspect-square 
                       bg-blue-500/15 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto px-2">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-4 sm:mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-xs sm:text-sm font-medium">
              AI-Powered Multi-Agent Platform
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight">
            <span className="text-white">Your Personal</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              AI Assistant Army
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Seven specialized AI agents working together to automate your tasks, 
            find opportunities, and save you time.
          </p>

          {!user && (
            <Link
              to="/agents/assistant"
              className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 
                         bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl
                         text-white font-semibold text-base sm:text-lg no-underline
                         shadow-lg shadow-purple-500/40 hover:opacity-90 transition-opacity
                         touch-manipulation active:scale-95"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}

          {user && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <span className="text-slate-400 text-sm sm:text-base text-center">
                Welcome back, <strong className="text-white">{user.name || user.email}</strong>
              </span>
              <Link
                to="/agents/assistant"
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3
                           bg-purple-500/20 border border-purple-500/30 rounded-lg
                           text-purple-300 font-medium text-sm sm:text-base no-underline
                           hover:bg-purple-500/30 transition-colors touch-manipulation"
              >
                🤖 AI Assistant
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-6 sm:py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[
            { icon: Zap, label: 'AI Agents', value: String(enabledAgents.length), color: 'rgb(251, 191, 36)' },
            { icon: Mail, label: 'Emails Processed', value: '10K+', color: 'rgb(96, 165, 250)' },
            { icon: Briefcase, label: 'Jobs Found', value: '5K+', color: 'rgb(167, 139, 250)' },
            { icon: Shield, label: 'Uptime', value: '99.9%', color: 'rgb(52, 211, 153)' }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-slate-800/50 border border-slate-700/30 rounded-xl sm:rounded-2xl 
                         p-3 sm:p-4 md:p-6 text-center"
            >
              <stat.icon 
                className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3" 
                style={{ color: stat.color }} 
              />
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-slate-400 text-xs sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agents Grid */}
      <section className="px-4 py-8 sm:py-12 max-w-7xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6 sm:mb-10">
          Meet Your AI Agents
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {enabledAgents.map((agent) => (
            <Link
              key={agent.id}
              to={agent.path}
              className="group block bg-slate-800/60 border border-slate-700/30 rounded-xl 
                         p-4 sm:p-6 no-underline relative overflow-hidden
                         hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-xl
                         active:scale-[0.98] transition-all duration-200 touch-manipulation"
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${agent.gradient}`} />

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl 
                                flex items-center justify-center bg-purple-500/15 shrink-0">
                  <agent.icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2
                                 flex items-center gap-2">
                    {agent.name}
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-50 
                                          group-hover:opacity-100 group-hover:translate-x-1 
                                          transition-all" />
                  </h3>
                  
                  <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {agent.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-700/30 rounded-full
                                   text-slate-400 text-[10px] sm:text-xs"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-4 py-8 pb-12 sm:pb-16 max-w-2xl mx-auto">
        <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3
                       bg-slate-600/30 border border-slate-600/30 rounded-lg
                       text-slate-400 no-underline hover:bg-slate-600/50 
                       transition-colors touch-manipulation text-sm sm:text-base"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            Settings
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3
                         bg-purple-500/15 border border-purple-500/30 rounded-lg
                         text-purple-300 no-underline hover:bg-purple-500/25 
                         transition-colors touch-manipulation text-sm sm:text-base"
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              Admin Panel
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;




