import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from '../ChatsPage.module.css'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  is_edited?: boolean
  reply_to_id?: string | null
  reply_to?: { id: string, content: string, sender_id: string }
}

interface ChatMessageProps {
  msg: Message
  partnerId: string
  partnerUsername: string
  onContextMenu: (e: React.MouseEvent, msg: Message) => void
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const ChatMessage = React.memo(function ChatMessage({
  msg,
  partnerId,
  partnerUsername,
  onContextMenu
}: ChatMessageProps): React.JSX.Element {
  const { t } = useTranslation()
  const isSentByMe = msg.sender_id !== partnerId
  const replyData = Array.isArray(msg.reply_to) ? msg.reply_to[0] : msg.reply_to

  return (
    <div
      className={`${styles['message-bubble']} ${isSentByMe ? styles['message-bubble--sent'] : styles['message-bubble--received']}`}
      onContextMenu={(e) => onContextMenu(e, msg)}
    >
      {replyData && (
        <div className={styles['message-bubble__reply']}>
          <span className={styles['reply-name']}>
            {replyData.sender_id === partnerId ? partnerUsername : t('chats.you', 'Вы')}
          </span>
          <span className={styles['reply-content']}>{replyData.content}</span>
        </div>
      )}
      <div className={styles['message-content']}>{msg.content}</div>
      <div className={styles['message-bubble__meta']}>
        {msg.is_edited && <span className={styles['message-edited']}>{t('chats.edited', '(изменено)')}</span>}
        <span className={styles['message-bubble__time']}>{formatTime(msg.created_at)}</span>
      </div>
    </div>
  )
})
