import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'secondary', className, type = 'button', ...rest }: Props) {
  return <button type={type} className={`button button-${variant} ${className ?? ''}`} {...rest} />
}
