import { useState, useEffect, useRef } from 'react'
import { getTaskStatus } from '../api/client'
import type { TaskStatus } from '../types/graph'

export function useTaskPolling(projectId: string | null) {
  const [task, setTask] = useState<TaskStatus | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!projectId) {
      setTask(null)
      return
    }

    const poll = async () => {
      try {
        const status = await getTaskStatus(projectId)
        setTask(status)
        if (status.status === 'ready' || status.status === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 1500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [projectId])

  return task
}
