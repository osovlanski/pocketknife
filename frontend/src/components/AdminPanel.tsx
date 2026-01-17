/**
 * AdminPanel Component
 * 
 * Admin dashboard with user management, settings, and audit logs.
 * Uses useAdmin hook for state management and CSS modules for styling.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Settings,
  Activity,
  BarChart3,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Crown,
  User as UserIcon,
  Loader2,
  Eye,
  Save,
  X,
  LogIn,
  Plug,
  Play,
  Power,
  ExternalLink,
  Zap
} from 'lucide-react';

// Hooks
import useAdmin from '../hooks/useAdmin';

// Services & Types
import * as adminApi from '../services/adminApi';
import logger from '../services/logger';
import type { User, AuditLog, SystemSetting, PlatformStats, ExternalApiConfig, ApiTestResult } from '../services/adminApi';

// Styles
import styles from '../styles/admin.module.css';
import commonStyles from '../styles/common.module.css';

// =============================================================================
// TYPES
// =============================================================================

type AdminTab = 'dashboard' | 'users' | 'settings' | 'apis' | 'audit';

// =============================================================================
// CONSTANTS
// =============================================================================

const ROLE_BADGE_CLASSES: Record<string, string> = {
  SUPER_ADMIN: styles.badgeSuperAdmin,
  ADMIN: styles.badgeAdmin,
  USER: styles.badgeUser
};

const ROLE_AVATAR_CLASSES: Record<string, string> = {
  SUPER_ADMIN: styles.userAvatarSuperAdmin,
  ADMIN: styles.userAvatarAdmin,
  USER: styles.userAvatarUser
};

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: styles.statusActive,
  INACTIVE: styles.statusInactive,
  SUSPENDED: styles.statusSuspended,
  PENDING: styles.statusPending
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  SUPER_ADMIN: <Crown style={{ width: '0.75rem', height: '0.75rem' }} />,
  ADMIN: <Shield style={{ width: '0.75rem', height: '0.75rem' }} />,
  USER: <UserIcon style={{ width: '0.75rem', height: '0.75rem' }} />
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const admin = useAdmin();

  // Load data when tab changes
  useEffect(() => {
    if (!admin.isLoading && !admin.error && admin.currentUser) {
      switch (activeTab) {
        case 'dashboard':
          admin.loadStats();
          break;
        case 'users':
          admin.loadUsers();
          break;
        case 'settings':
          admin.loadSettings();
          break;
        case 'apis':
          // APIs tab handles its own loading
          break;
        case 'audit':
          admin.loadAuditLogs();
          break;
      }
    }
  }, [activeTab, admin.isLoading, admin.error, admin.currentUser]);

  // Loading state
  if (admin.isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={commonStyles.spinner} style={{ width: '2rem', height: '2rem', color: 'rgb(192, 132, 252)' }} />
        <span className={styles.loadingText}>Loading admin panel...</span>
      </div>
    );
  }

  // Not signed in state
  if (admin.isNotSignedIn) {
    return (
      <div className={styles.signInRequired}>
        <LogIn className={styles.signInIcon} />
        <h2 className={styles.signInTitle}>Sign In Required</h2>
        <p className={styles.signInDescription}>Please sign in to access the admin panel.</p>
        <p className={styles.signInHint}>Use the Sign In button in the top right corner.</p>
      </div>
    );
  }

  // Error state
  if (admin.error && !admin.currentUser) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle className={styles.errorIcon} />
        <h2 className={styles.errorTitle}>Access Denied</h2>
        <p className={styles.errorMessage}>{admin.error}</p>
        <button
          onClick={admin.initialize}
          className={`${commonStyles.btn} ${commonStyles.btnPrimary}`}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="w-10 h-10 text-purple-400" />
            Admin Panel
          </h1>
          <p className="text-slate-400 mt-1">
            Manage users, settings, and monitor platform activity
          </p>
        </div>
        {admin.currentUser && (
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl">
            <div className="text-right">
              <p className="font-semibold">{admin.currentUser.name || admin.currentUser.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_BADGE_CLASSES[admin.currentUser.role]}`}>
                {ROLE_ICONS[admin.currentUser.role]} {admin.currentUser.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <TabButton
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          icon={<BarChart3 className="w-5 h-5" />}
          label="Dashboard"
        />
        <TabButton
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          icon={<Users className="w-5 h-5" />}
          label="Users"
        />
        <TabButton
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
        />
        <TabButton
          active={activeTab === 'apis'}
          onClick={() => setActiveTab('apis')}
          icon={<Plug className="w-5 h-5" />}
          label="External APIs"
        />
        <TabButton
          active={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
          icon={<Activity className="w-5 h-5" />}
          label="Audit Log"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'users' && <UsersTab currentUser={admin.currentUser} />}
      {activeTab === 'settings' && <SettingsTab isSuperAdmin={admin.currentUser?.role === 'SUPER_ADMIN'} />}
      {activeTab === 'apis' && <ExternalApisTab isSuperAdmin={admin.currentUser?.role === 'SUPER_ADMIN'} />}
      {activeTab === 'audit' && <AuditTab />}
    </div>
  );
};

// =============================================================================
// TAB BUTTON COMPONENT
// =============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
      active
        ? 'bg-purple-500 text-white'
        : 'text-slate-400 hover:text-white hover:bg-white/10'
    }`}
  >
    {icon}
    {label}
  </button>
);

// =============================================================================
// DASHBOARD TAB
// =============================================================================

const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { stats } = await adminApi.getStats();
      setStats(stats);
    } catch (error) {
      logger.error('Failed to load stats', { error });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-slate-400">Failed to load statistics</p>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.users.total}
          subtitle={`${stats.users.active} active`}
          icon={<Users className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Tasks"
          value={stats.tasks.total}
          subtitle={`${stats.tasks.completionRate}% completion`}
          icon={<CheckCircle className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Saved Jobs"
          value={stats.savedJobs}
          icon={<Activity className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Activity Today"
          value={stats.activityToday}
          icon={<BarChart3 className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* Activity by Agent */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-bold mb-4">Activity by Agent (Last 7 Days)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.activityByAgent).map(([agent, count]) => (
            <div key={agent} className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-slate-400 capitalize">{agent}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'purple' | 'emerald' | 'blue' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
};

// =============================================================================
// USERS TAB
// =============================================================================

interface UsersTabProps {
  currentUser: User | null;
}

const UsersTab: React.FC<UsersTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({
        page,
        limit: 10,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined
      });
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      logger.error('Failed to load users', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.email}?`)) return;

    try {
      await adminApi.deleteUser(user.id);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:border-purple-500 focus:outline-none w-64"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white/10 rounded-lg border border-white/20"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white/10 rounded-lg border border-white/20"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Activity</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Last Login</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{user.name || '-'}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${ROLE_BADGE_CLASSES[user.role] || ''}`}>
                      {ROLE_ICONS[user.role]}
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-sm ${STATUS_CLASSES[user.status] || ''}`}>
                      {user.status === 'ACTIVE' && <CheckCircle className="w-4 h-4" />}
                      {user.status === 'INACTIVE' && <XCircle className="w-4 h-4" />}
                      {user.status === 'SUSPENDED' && <AlertTriangle className="w-4 h-4" />}
                      {user.status === 'PENDING' && <Clock className="w-4 h-4" />}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {user._count?.activityLogs || 0} actions
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user.id !== currentUser?.id && currentUser?.role === 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 bg-white/10 rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 py-2 bg-white/5 rounded-lg">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 bg-white/10 rounded-lg disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <UserModal
          onClose={() => setShowCreateModal(false)}
          onSave={loadUsers}
          isSuperAdmin={currentUser?.role === 'SUPER_ADMIN'}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={loadUsers}
          isSuperAdmin={currentUser?.role === 'SUPER_ADMIN'}
        />
      )}
    </div>
  );
};

// =============================================================================
// USER MODAL
// =============================================================================

interface UserModalProps {
  user?: User;
  onClose: () => void;
  onSave: () => void;
  isSuperAdmin?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave, isSuperAdmin }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'USER');
  const [status, setStatus] = useState(user?.status || 'ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setSaving(true);
      if (user) {
        await adminApi.updateUser(user.id, { name, role, status });
      } else {
        await adminApi.createUser({ email, name, role, status });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">
            {user ? 'Edit User' : 'Create User'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user}
              required
              className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:border-purple-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              disabled={!isSuperAdmin && (role === 'ADMIN' || role === 'SUPER_ADMIN')}
              className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 disabled:opacity-50"
            >
              <option value="USER">User</option>
              {isSuperAdmin && (
                <>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// EXTERNAL APIS TAB
// =============================================================================

interface ExternalApisTabProps {
  isSuperAdmin?: boolean;
}

const ExternalApisTab: React.FC<ExternalApisTabProps> = ({ isSuperAdmin }) => {
  const [apis, setApis] = useState<Record<string, ExternalApiConfig[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ApiTestResult>>({});
  const [testingAll, setTestingAll] = useState(false);

  useEffect(() => {
    loadApis();
  }, []);

  const loadApis = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug('Loading external API configurations...');
      const response = await adminApi.getExternalApis();
      logger.debug('API Response received', { count: Object.keys(response.apis || {}).length });
      const grouped = response.apis || {};
      setApis(grouped);
    } catch (err: any) {
      logger.error('Failed to load APIs', { error: err.message });
      setError(err.response?.data?.error || err.message || 'Failed to load API configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (name: string) => {
    try {
      await adminApi.toggleExternalApi(name);
      loadApis();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to toggle API');
    }
  };

  const handleTestSingle = async (name: string) => {
    try {
      setTesting(name);
      const result = await adminApi.testExternalApi(name);
      setTestResults(prev => ({ ...prev, [name]: result }));
      loadApis();
    } catch (error) {
      logger.error('Test failed', { error });
    } finally {
      setTesting(null);
    }
  };

  const handleTestAll = async () => {
    try {
      setTestingAll(true);
      setError(null);
      logger.debug('Testing all APIs across all categories...');
      const response = await adminApi.testAllExternalApis(); // Test all categories
      logger.debug('Test results received', { count: response.results?.length || 0 });
      const resultMap: Record<string, ApiTestResult> = {};
      response.results.forEach(r => { resultMap[r.name] = r; });
      setTestResults(resultMap);
      loadApis();
    } catch (err: any) {
      logger.error('Test all failed', { 
        error: err.message, 
        response: err.response?.data, 
        status: err.response?.status 
      });
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      const errorDetails = err.response?.data?.details || '';
      setError(`Test failed: ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    } finally {
      setTestingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
            <XCircle className="w-5 h-5" />
            Failed to Load API Configurations
          </div>
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={loadApis}
            className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const apiCount = Object.values(apis).flat().length;
  const categoryLabels: Record<string, { label: string; icon: string }> = {
    jobs: { label: '💼 Job Search APIs', icon: '💼' },
    travel: { label: '✈️ Travel APIs', icon: '✈️' },
    learning: { label: '📚 Learning APIs', icon: '📚' },
    shopping: { label: '🛒 Shopping APIs', icon: '🛒' },
    problems: { label: '🧩 Problem Solving APIs', icon: '🧩' },
    ai: { label: '🤖 AI/LLM APIs', icon: '🤖' },
    notifications: { label: '🔔 Notification APIs', icon: '🔔' },
    email: { label: '📧 Email APIs', icon: '📧' }
  };

  return (
    <div className="space-y-6">
      {/* Header with Test All button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">External API Configuration</h2>
          <p className="text-sm text-slate-400">
            Manage which external APIs are used by agents. Toggle APIs on/off or test their connectivity.
          </p>
        </div>
        <button
          onClick={handleTestAll}
          disabled={testingAll || apiCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {testingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          Test All APIs
        </button>
      </div>

      {/* Empty State */}
      {apiCount === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-amber-300 mb-2">No External APIs Configured</h3>
          <p className="text-slate-400 text-sm mb-4">
            The external API configurations haven't been initialized yet. This usually means the database migration needs to be run.
          </p>
          <div className="bg-slate-800/50 rounded-lg p-3 text-left text-xs font-mono text-slate-300">
            <p className="mb-1"># Run these commands in the backend folder:</p>
            <p>cd backend</p>
            <p>npx prisma migrate dev --name add_external_api_config</p>
            <p>npx prisma generate</p>
          </div>
          <button
            onClick={loadApis}
            className="mt-4 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-sm text-amber-300"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh
          </button>
        </div>
      )}

      {/* API Categories */}
      {Object.entries(apis).map(([category, categoryApis]) => (
        <div key={category} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="bg-white/5 px-4 py-3 border-b border-white/10">
            <h3 className="font-bold">
              {categoryLabels[category]?.label || category}
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {categoryApis.map((api) => {
              const result = testResults[api.name];
              const isCurrentlyTesting = testing === api.name;
              
              return (
                <div key={api.name} className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-white">{api.displayName}</h4>
                        
                        {/* Status indicators */}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          api.isEnabled 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {api.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        
                        {api.requiresAuth && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            api.hasApiKey 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {api.hasApiKey ? '🔑 API Key Set' : '⚠️ No API Key'}
                          </span>
                        )}
                        
                        {result && (
                          <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${
                            result.isHealthy 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {result.isHealthy ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {result.isHealthy ? `${result.responseTime}ms` : 'Failed'}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-400 mt-1">
                        {api.description || 'No description'}
                      </p>
                      
                      {/* Additional info */}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        {api.rateLimit && (
                          <span>Rate limit: {api.rateLimit}/{api.rateLimitPeriod}</span>
                        )}
                        {api.apiKeyEnvVar && (
                          <span>Env: {api.apiKeyEnvVar}</span>
                        )}
                        {api.docsUrl && (
                          <a 
                            href={api.docsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Docs
                          </a>
                        )}
                      </div>
                      
                      {/* Error display */}
                      {result && !result.isHealthy && result.error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleTestSingle(api.name)}
                        disabled={isCurrentlyTesting}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Test API"
                      >
                        {isCurrentlyTesting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        ) : (
                          <Play className="w-4 h-4 text-blue-400" />
                        )}
                      </button>
                      
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleToggle(api.name)}
                          className={`p-2 rounded-lg transition-colors ${
                            api.isEnabled 
                              ? 'hover:bg-red-500/20 text-emerald-400' 
                              : 'hover:bg-emerald-500/20 text-slate-400'
                          }`}
                          title={api.isEnabled ? 'Disable API' : 'Enable API'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Help text */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
        <p className="text-blue-300 font-medium mb-2">💡 About External APIs</p>
        <ul className="text-slate-400 space-y-1">
          <li>• <strong>Free APIs</strong> (RemoteOK, Remotive, Arbeitnow, DEV.to, LeetCode): No configuration needed</li>
          <li>• <strong>JSearch</strong>: Requires RAPIDAPI_KEY for LinkedIn/Glassdoor data</li>
          <li>• <strong>Amadeus</strong>: Requires AMADEUS_API_KEY and AMADEUS_API_SECRET for flight/hotel search</li>
          <li>• <strong>Anthropic</strong>: Requires ANTHROPIC_API_KEY for AI features</li>
          <li>• <strong>Telegram/Discord</strong>: Configure bot tokens for notifications</li>
          <li>• Disabled APIs will be skipped by their respective agents</li>
        </ul>
      </div>
    </div>
  );
};

// =============================================================================
// SETTINGS TAB
// =============================================================================

interface SettingsTabProps {
  isSuperAdmin?: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ isSuperAdmin }) => {
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { settings } = await adminApi.getSettings();
      setSettings(settings);
    } catch (error) {
      logger.error('Failed to load settings', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string) => {
    try {
      await adminApi.updateSetting(id, editValue);
      setEditingId(null);
      loadSettings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save setting');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    general: '⚙️ General',
    agents: '🤖 Agents',
    notifications: '🔔 Notifications',
    security: '🔒 Security'
  };

  return (
    <div className="space-y-6">
      {Object.entries(settings).map(([category, categorySettings]) => (
        <div key={category} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="bg-white/5 px-4 py-3 border-b border-white/10">
            <h3 className="font-bold">{categoryLabels[category] || category}</h3>
          </div>
          <div className="divide-y divide-white/5">
            {categorySettings.map((setting) => (
              <div key={setting.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{setting.name}</p>
                  {setting.description && (
                    <p className="text-sm text-slate-400">{setting.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingId === setting.id ? (
                    <>
                      {typeof setting.value === 'boolean' ? (
                        <select
                          value={editValue ? 'true' : 'false'}
                          onChange={(e) => setEditValue(e.target.value === 'true')}
                          className="px-3 py-1 bg-white/10 rounded border border-white/20"
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      ) : (
                        <input
                          type={typeof setting.value === 'number' ? 'number' : 'text'}
                          value={editValue}
                          onChange={(e) => setEditValue(
                            typeof setting.value === 'number' 
                              ? parseInt(e.target.value) 
                              : e.target.value
                          )}
                          className="px-3 py-1 bg-white/10 rounded border border-white/20 w-32"
                        />
                      )}
                      <button
                        onClick={() => handleSave(setting.id)}
                        className="p-1 bg-emerald-500 rounded hover:bg-emerald-600"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 bg-red-500/20 rounded hover:bg-red-500/40"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`px-3 py-1 rounded ${
                        typeof setting.value === 'boolean'
                          ? setting.value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                          : 'bg-white/10'
                      }`}>
                        {typeof setting.value === 'boolean'
                          ? setting.value ? 'Enabled' : 'Disabled'
                          : String(setting.value)}
                      </span>
                      {isSuperAdmin && setting.isEditable && (
                        <button
                          onClick={() => {
                            setEditingId(setting.id);
                            setEditValue(setting.value);
                          }}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// AUDIT TAB
// =============================================================================

const AuditTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAuditLogs({ page, limit: 20 });
      setLogs(response.logs);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      logger.error('Failed to load audit logs', { error });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete')) return 'text-red-400';
    if (action.includes('create')) return 'text-emerald-400';
    if (action.includes('update')) return 'text-blue-400';
    return 'text-slate-400';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No audit logs yet</p>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-slate-400">
                      by {log.admin.name || log.admin.email}
                      {log.targetEmail && ` → ${log.targetEmail}`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.newValue && (
                  <div className="mt-2 text-xs bg-white/5 rounded p-2 font-mono">
                    {JSON.stringify(log.newValue, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 bg-white/10 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 bg-white/5 rounded-lg">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 bg-white/10 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPanel;

