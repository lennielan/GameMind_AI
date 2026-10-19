import React from 'react'
import { KeyRound, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ConfirmModal } from '../ui/ConfirmModal'
import type { AiFeatureUsageStatus } from '@shared/types'
import './AiUsageLimit.css'

interface AiUsageLimitModalProps {
  status: AiFeatureUsageStatus | null
  onClose: () => void
}

export function AiUsageLimitModal({ status, onClose }: AiUsageLimitModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const featureKey = status?.feature || 'recommendations'
  const featureLocalized = t(`aiUsage.features.${featureKey}`, featureKey)

  const openProviderSettings = () => {
    onClose()
    navigate('/settings', { state: { activeTab: 'ai', providerSetup: true } })
  }

  return (
    <ConfirmModal
      isOpen={Boolean(status)}
      title={t('aiUsage.limitExceededTitle', 'Лимит бесплатных использований исчерпан')}
      description={t('aiUsage.limitExceededDesc', 'Лимит {{feature}} закончился. Добавьте свой личный ключ, чтобы снять ограничения ИИ-функций.', { feature: featureLocalized })}
      cancelText={t('aiUsage.notNow', 'Не сейчас')}
      confirmText={t('aiUsage.openSettings', 'Открыть провайдера ИИ')}
      onCancel={onClose}
      onConfirm={openProviderSettings}
    />
  )
}

interface AiUsageCounterProps {
  status?: AiFeatureUsageStatus
  compact?: boolean
}

export function AiUsageCounter({ status, compact = false }: AiUsageCounterProps): React.JSX.Element | null {
  const { t } = useTranslation()
  if (!status || status.unlimited) return null

  const periodText = t(`aiUsage.periods.${status.period}`, status.period)

  return (
    <span className={`ai-usage-counter ${compact ? 'ai-usage-counter--compact' : ''}`}>
      <div className="ai-usage-counter__icon-badge">
        <Sparkles size={12} />
      </div>
      <span className="ai-usage-counter__text">
        {t('aiUsage.remaining', 'Осталось {{remaining}} из {{limit}} {{period}}', {
          remaining: status.remaining,
          limit: status.limit,
          period: periodText
        })}
      </span>
    </span>
  )
}
