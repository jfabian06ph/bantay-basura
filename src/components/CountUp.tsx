import { useCountUp } from '../hooks/useCountUp'

interface Props {
  value: number
  /** Fixed decimal places; defaults to integer. */
  decimals?: number
  prefix?: string
  suffix?: string
  /** Set false to hold at 0 until (e.g.) the element scrolls into view. */
  active?: boolean
  duration?: number
}

/** A number that animates up from 0 the first time it becomes active. */
export default function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  active = true,
  duration,
}: Props) {
  const n = useCountUp(value, active, duration)
  return (
    <>
      {prefix}
      {n.toFixed(decimals)}
      {suffix}
    </>
  )
}
