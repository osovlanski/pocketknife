/**
 * Button Component
 * 
 * Reusable button component with variants.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from '../../styles/common.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  danger: styles.btnDanger,
  success: styles.btnSuccess,
  ghost: styles.btnGhost
};

const sizeStyles: Record<ButtonSize, string> = {
  small: styles.btnSmall,
  medium: '',
  large: styles.btnLarge,
  icon: styles.btnIcon
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const classNames = [
    styles.btn,
    variantStyles[variant],
    sizeStyles[size],
    disabled || isLoading ? styles.btnDisabled : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={styles.spinner} style={{ width: '1.25rem', height: '1.25rem' }} />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
};

export default Button;



