import { useCallback, useEffect, useState } from 'react'

/** Seconds left until a deadline; `start(n)` restarts it. */
export function useCountdown(initialSeconds = 0) {
  const [deadline, setDeadline] = useState(() => (initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline <= Date.now()) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [deadline])

  const start = useCallback((seconds: number) => {
    setNow(Date.now())
    setDeadline(Date.now() + seconds * 1000)
  }, [])

  return { secondsLeft: Math.max(0, Math.ceil((deadline - now) / 1000)), start }
}

/** 45 → "0:45" */
export function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
