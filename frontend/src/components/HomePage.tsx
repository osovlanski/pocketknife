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
  Zap, Shield, Settings
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
    <div style={{ 
      minHeight: '100%',
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 27, 75) 50%, rgb(15, 23, 42) 100%)'
    }}>
      {/* Hero Section */}
      <section style={{
        padding: '4rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'pulse 4s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: '250px',
            height: '250px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'pulse 4s ease-in-out infinite 1s'
          }} />
        </div>

        <div style={{ position: 'relative', maxWidth: '48rem', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '9999px',
            marginBottom: '1.5rem'
          }}>
            <Sparkles style={{ width: '1rem', height: '1rem', color: 'rgb(167, 139, 250)' }} />
            <span style={{ color: 'rgb(196, 181, 253)', fontSize: '0.875rem', fontWeight: 500 }}>
              AI-Powered Multi-Agent Platform
            </span>
          </div>

          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            marginBottom: '1.5rem',
            lineHeight: 1.1
          }}>
            <span style={{ color: 'white' }}>Your Personal</span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(251, 146, 60) 50%, rgb(245, 158, 11) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Assistant Army
            </span>
          </h1>

          <p style={{
            fontSize: '1.25rem',
            color: 'rgb(148, 163, 184)',
            marginBottom: '2rem',
            maxWidth: '36rem',
            margin: '0 auto 2rem'
          }}>
            Seven specialized AI agents working together to automate your tasks, 
            find opportunities, and save you time.
          </p>

          {!user && (
            <Link
              to="/agents/email"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(99, 102, 241) 100%)',
                borderRadius: '0.75rem',
                color: 'white',
                fontWeight: 600,
                fontSize: '1.125rem',
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              Get Started
              <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
            </Link>
          )}

          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <span style={{ color: 'rgb(148, 163, 184)' }}>
                Welcome back, <strong style={{ color: 'white' }}>{user.name || user.email}</strong>
              </span>
              <Link
                to="/agents/email"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '0.5rem',
                  color: 'rgb(196, 181, 253)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Go to Agents
                <ArrowRight style={{ width: '1rem', height: '1rem' }} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        padding: '2rem 1.5rem',
        maxWidth: '72rem',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}>
          {[
            { icon: Zap, label: 'AI Agents', value: String(enabledAgents.length), color: 'rgb(251, 191, 36)' },
            { icon: Mail, label: 'Emails Processed', value: '10K+', color: 'rgb(96, 165, 250)' },
            { icon: Briefcase, label: 'Jobs Found', value: '5K+', color: 'rgb(167, 139, 250)' },
            { icon: Shield, label: 'Uptime', value: '99.9%', color: 'rgb(52, 211, 153)' }
          ].map((stat, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(71, 85, 105, 0.3)',
                borderRadius: '1rem',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <stat.icon style={{ 
                width: '2rem', 
                height: '2rem', 
                color: stat.color,
                margin: '0 auto 0.75rem'
              }} />
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>
                {stat.value}
              </div>
              <div style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agents Grid */}
      <section style={{
        padding: '3rem 1.5rem',
        maxWidth: '80rem',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'white',
          textAlign: 'center',
          marginBottom: '2.5rem'
        }}>
          Meet Your AI Agents
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {enabledAgents.map((agent) => (
            <Link
              key={agent.id}
              to={agent.path}
              style={{
                display: 'block',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(71, 85, 105, 0.3)',
                borderRadius: '1rem',
                padding: '1.5rem',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.3)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Gradient accent */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(to right, var(--tw-gradient-stops))`,
                backgroundImage: `linear-gradient(to right, ${agent.gradient.split(' ')[0].replace('from-', '')} 0%, ${agent.gradient.split(' ')[1].replace('to-', '')} 100%)`
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(139, 92, 246, 0.15)',
                  flexShrink: 0
                }}>
                  <agent.icon style={{ 
                    width: '1.5rem', 
                    height: '1.5rem', 
                    color: 'rgb(167, 139, 250)' 
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'white',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {agent.name}
                    <ArrowRight style={{ 
                      width: '1rem', 
                      height: '1rem', 
                      color: 'rgb(148, 163, 184)',
                      opacity: 0.5
                    }} />
                  </h3>
                  
                  <p style={{
                    color: 'rgb(148, 163, 184)',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    lineHeight: 1.5
                  }}>
                    {agent.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {agent.features.map((feature, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(71, 85, 105, 0.3)',
                          borderRadius: '9999px',
                          color: 'rgb(148, 163, 184)',
                          fontSize: '0.75rem'
                        }}
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
      <section style={{
        padding: '2rem 1.5rem 4rem',
        maxWidth: '48rem',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <Link
            to="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'rgba(71, 85, 105, 0.3)',
              border: '1px solid rgba(71, 85, 105, 0.3)',
              borderRadius: '0.5rem',
              color: 'rgb(148, 163, 184)',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Settings style={{ width: '1.25rem', height: '1.25rem' }} />
            Settings
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '0.5rem',
                color: 'rgb(196, 181, 253)',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Shield style={{ width: '1.25rem', height: '1.25rem' }} />
              Admin Panel
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;



