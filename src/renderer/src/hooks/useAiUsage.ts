import { useCallback, useEffect, useState } from 'react'
import type { AiFeatureId, AiFeatureUsageStatus } from '@shared/types'

export function useAiUsage() {
  const [usage, setUsage] = useState<Record<AiFeatureId, AiFeatureUsageStatus> | null>(null)

  const refreshUsage = useCallback(async () => {
    const result = await window.api.ai.getUsage()
    if (result.success && result.data) {
      setUsage(Object.fromEntries(result.data.map(status => [status.feature, status])) as Record<AiFeatureId, AiFeatureUsageStatus>)
    }
  }, [])

  useEffect(() => { void refreshUsage() }, [refreshUsage])

  return { usage, refreshUsage }
}
