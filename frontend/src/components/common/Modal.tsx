/**
 * Modal Component
 * 
 * Reusable modal dialog component.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from '../../styles/modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'default' | 'large' | 'xlarge';
  showCloseButton?: boolean;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'default',
  showCloseButton = true,
  children
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalClassName = [
    styles.modal,
    size === 'large' && styles.modalLarge,
    size === 'xlarge' && styles.modalXLarge
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={modalClassName} onClick={e => e.stopPropagation()}>
        {showCloseButton && (
          <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">
            <X style={{ width: '1.5rem', height: '1.5rem' }} />
          </button>
        )}

        {(title || icon) && (
          <div className={styles.modalHeader}>
            {icon && <div className={styles.modalIcon}>{icon}</div>}
            {title && <h2 className={styles.modalTitle}>{title}</h2>}
            {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
          </div>
        )}

        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

