import { useReveal } from '../hooks/useReveal'

interface Props {
  children: React.ReactNode
  /** Stagger, in ms, applied as a transition-delay when revealing. */
  delay?: number
  className?: string
}

/**
 * Fades + lifts its children into view the first time they scroll on-screen.
 * The visual (opacity + translateY, springy easing) lives in `.bb-reveal`.
 */
export default function Reveal({ children, delay = 0, className = '' }: Props) {
  const { ref, shown } = useReveal()
  return (
    <div
      ref={ref}
      className={`bb-reveal ${shown ? 'bb-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
