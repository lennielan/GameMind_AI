import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './ConfirmModal.css'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  isDestructive = false,
  onConfirm,
  onCancel
}: ConfirmModalProps): React.JSX.Element | null {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 9999 }}>
      <motion.div 
        className="modal-content confirm-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <button className="modal-close" onClick={onCancel}>
          <X size={20} />
        </button>

        <h3 className="confirm-modal__title">{title}</h3>
        {description && <p className="confirm-modal__desc">{description}</p>}

        <div className="confirm-modal__actions">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText || t('common.cancel', 'Отмена')}
          </button>
          <button 
            className={isDestructive ? "btn-danger" : "btn-primary"} 
            onClick={onConfirm}
          >
            {confirmText || t('common.confirm', 'ОК')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
