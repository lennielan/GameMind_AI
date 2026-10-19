import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  User,
  UserPlus,
  Users,
  MessageSquare,
  Dna,
  Trophy,
  Palette,
  Gamepad2,
  Compass,
  Activity,
  Send,
  Share2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react'
import './SocialAuthPrompt.css'

export type SocialAuthVariant = 'profile' | 'friends' | 'chats'

interface SocialAuthPromptProps {
  variant?: SocialAuthVariant
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export function SocialAuthPrompt({
  variant = 'profile'
}: SocialAuthPromptProps): React.JSX.Element {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Config per variant
  const config = {
    profile: {
      heroIcon: <User size={36} />,
      title: t('socialAuth.profile.title', 'Ваш игровой профиль'),
      desc: t(
        'socialAuth.profile.desc',
        'Авторизуйтесь, чтобы сформировать уникальную карточку игрока, управлять коллекцией и делиться достижениями.'
      ),
      button: t('socialAuth.profile.button', 'Создать профиль GameMind'),
      cards: [
        {
          icon: <Dna size={22} />,
          title: t('socialAuth.profile.benefit1Title', 'Уникальный Player DNA'),
          desc: t('socialAuth.profile.benefit1Desc', 'Публикуйте ваш игровой архетип и вкусовые предпочтения в витрине.')
        },
        {
          icon: <Trophy size={22} />,
          title: t('socialAuth.profile.benefit2Title', 'Витрина достижений'),
          desc: t('socialAuth.profile.benefit2Desc', 'Демонстрируйте редкие трофеи и знаковые игры из вашей коллекции.')
        },
        {
          icon: <Palette size={22} />,
          title: t('socialAuth.profile.benefit3Title', 'Кастомизация и бейджи'),
          desc: t('socialAuth.profile.benefit3Desc', 'Выбирайте эксклюзивные рамки, настраивайте приватность и аватар.')
        }
      ]
    },
    friends: {
      heroIcon: <Users size={36} />,
      title: t('socialAuth.friends.title', 'Играйте вместе с друзьями'),
      desc: t(
        'socialAuth.friends.desc',
        'Войдите в аккаунт, чтобы находить единомышленников по Player DNA, добавлять друзей и собирать пати для кооператива.'
      ),
      button: t('socialAuth.friends.button', 'Войти и найти друзей'),
      cards: [
        {
          icon: <Gamepad2 size={22} />,
          title: t('socialAuth.friends.benefit1Title', 'Умный подбор коопа'),
          desc: t('socialAuth.friends.benefit1Desc', 'Мгновенный поиск общих игр в библиотеках для идеального совместного вечера.')
        },
        {
          icon: <Compass size={22} />,
          title: t('socialAuth.friends.benefit2Title', 'Совместимость вкусов'),
          desc: t('socialAuth.friends.benefit2Desc', 'Сравнивайте ваш Player DNA с профилями друзей и открывайте похожие интересы.')
        },
        {
          icon: <Activity size={22} />,
          title: t('socialAuth.friends.benefit3Title', 'Сетевой статус'),
          desc: t('socialAuth.friends.benefit3Desc', 'Следите за активностью друзей в реальном времени и зовите в игру.')
        }
      ]
    },
    chats: {
      heroIcon: <MessageSquare size={36} />,
      title: t('socialAuth.chats.title', 'Личные сообщения и чаты'),
      desc: t(
        'socialAuth.chats.desc',
        'Авторизуйтесь, чтобы общаться с друзьями, обсуждать игровые новинки и координировать совместные сессии.'
      ),
      button: t('socialAuth.chats.button', 'Войти для доступа к чатам'),
      cards: [
        {
          icon: <Send size={22} />,
          title: t('socialAuth.chats.benefit1Title', 'Быстрый мессенджер'),
          desc: t('socialAuth.chats.benefit1Desc', 'Удобный чат в реальном времени с поддержкой ответов и закрепления диалогов.')
        },
        {
          icon: <Share2 size={22} />,
          title: t('socialAuth.chats.benefit2Title', 'Координация пати'),
          desc: t('socialAuth.chats.benefit2Desc', 'Отправляйте ссылки на игры и договаривайтесь о совместном прохождении.')
        },
        {
          icon: <ShieldCheck size={22} />,
          title: t('socialAuth.chats.benefit3Title', 'Приватность и контроль'),
          desc: t('socialAuth.chats.benefit3Desc', 'Управляйте уведомлениями, заглушайте чаты и настраивайте приватность.')
        }
      ]
    }
  }[variant]

  return (
    <div className="social-auth-prompt__container">
      <motion.div
        className="social-auth-prompt"
        initial="hidden"
        animate="show"
        variants={fadeUp}
      >
        <div className="social-auth-prompt__glow" />

        <div className="social-auth-prompt__hero-icon">
          <div className="social-auth-prompt__icon-inner">
            {config.heroIcon}
          </div>
        </div>

        <h2 className="social-auth-prompt__title">{config.title}</h2>
        <p className="social-auth-prompt__desc">{config.desc}</p>

        <div className="social-auth-prompt__grid">
          {config.cards.map((card, index) => (
            <div key={index} className="social-auth-prompt__card">
              <div className="social-auth-prompt__card-icon">{card.icon}</div>
              <div className="social-auth-prompt__card-content">
                <h4>{card.title}</h4>
                <p>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="social-auth-prompt__btn"
          onClick={() => navigate('/settings', { state: { activeTab: 'account' } })}
        >
          <UserPlus size={18} />
          <span>{config.button}</span>
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </div>
  )
}