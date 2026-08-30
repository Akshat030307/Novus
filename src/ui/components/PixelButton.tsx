import type { ButtonHTMLAttributes } from 'react'

type Tone = 'default' | 'primary' | 'good' | 'bad'

const tones: Record<Tone, string> = {
  default: 'border-line bg-panel-2 text-ink hover:border-marigold hover:text-marigold',
  primary: 'border-marigold bg-marigold/10 text-marigold hover:bg-marigold/20',
  good: 'border-jade bg-jade/10 text-jade hover:bg-jade/20',
  bad: 'border-coral bg-coral/10 text-coral hover:bg-coral/20',
}

export function PixelButton({
  tone = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      {...props}
      className={`border-2 px-4 py-2 font-display text-[11px] tracking-wide transition-colors
        disabled:cursor-not-allowed disabled:border-line disabled:text-muted/40 disabled:hover:bg-transparent
        ${tones[tone]} ${className}`}
    />
  )
}
