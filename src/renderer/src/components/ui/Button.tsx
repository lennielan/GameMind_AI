import React from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'terminal' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  isLoading?: boolean
  fullWidth?: boolean
  children?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    iconLeft,
    iconRight,
    isLoading = false,
    fullWidth = false,
    disabled = false,
    className = '',
    type = 'button',
    ...rest
  },
  ref
): React.JSX.Element {
  const sizeClass = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd

  const variantClassMap: Record<ButtonVariant, string> = {
    primary: styles.variantPrimary,
    secondary: styles.variantSecondary,
    terminal: styles.variantTerminal,
    ghost: styles.variantGhost,
    danger: styles.variantDanger
  }

  const variantClass = variantClassMap[variant] || styles.variantPrimary
  const loadingClass = isLoading ? styles.loading : ''
  const fullWidthClass = fullWidth ? styles.fullWidth : ''

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${styles.button} ${sizeClass} ${variantClass} ${loadingClass} ${fullWidthClass} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        iconLeft && <span className={styles.iconLeft}>{iconLeft}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && iconRight && <span className={styles.iconRight}>{iconRight}</span>}
    </button>
  )
})
