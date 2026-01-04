/**
 * SignInModal Component
 * 
 * Modal for user sign-in with email or Google.
 */

import React, { useState } from 'react';
import { User, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import * as authApi from '../../services/authApi';
import styles from '../../styles/modal.module.css';
import commonStyles from '../../styles/common.module.css';

export interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignIn }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await onSignIn(email);
      if (result.success) {
        setEmail('');
        onClose();
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    onClose();
    window.location.href = authApi.getGoogleAuthUrl();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign In"
      subtitle="Enter your email to access all features"
      icon={<User style={{ width: '2rem', height: '2rem', color: 'white' }} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Email Input */}
        <div>
          <label className={commonStyles.label}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className={commonStyles.input}
            placeholder="you@example.com"
            autoFocus
          />
          {error && (
            <p style={{ color: 'rgb(248, 113, 113)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {error}
            </p>
          )}
        </div>

        {/* Sign In Button */}
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          style={{ width: '100%' }}
        >
          Sign In
        </Button>

        {/* Divider */}
        <div className={styles.dividerWithText}>
          <div className={styles.dividerLine}>
            <div className={styles.dividerLineInner} />
          </div>
          <div className={styles.dividerText}>
            <span className={styles.dividerTextInner}>or</span>
          </div>
        </div>

        {/* Google Sign In */}
        <button className={styles.googleButton} onClick={handleGoogleSignIn}>
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </Modal>
  );
};

export default SignInModal;

