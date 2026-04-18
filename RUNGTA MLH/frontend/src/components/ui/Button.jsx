export default function Button({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'vx-btn-primary',
    secondary: 'vx-btn-secondary',
    ghost: 'vx-btn-ghost',
  }

  return (
    <button type={type} className={`${variants[variant] || variants.primary} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
