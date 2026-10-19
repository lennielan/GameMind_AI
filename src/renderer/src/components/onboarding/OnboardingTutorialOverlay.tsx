import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Bot,
  Dna,
  Gamepad2,
  Users,
  Key,
  Cloud,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { useOnboardingStore } from '../../stores/onboarding.store'
import './OnboardingTutorialOverlay.css'

export function OnboardingTutorialOverlay(): React.JSX.Element | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMinimized, setIsMinimized] = useState(false)

  const {
    isOpen,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    checkAutoStart
  } = useOnboardingStore()

  // Trigger auto-start check on initial mount
  useEffect(() => {
    checkAutoStart()
  }, [])

  // Sync route based on step
  useEffect(() => {
    if (!isOpen) return

    if (currentStep === 1 || currentStep === 2 || currentStep === 5) {
      if (location.pathname !== '/') {
        navigate('/', { replace: true })
      }
    } else if (currentStep === 3) {
      // Step 3: Steam settings
      if (location.pathname !== '/settings' || location.hash !== '#steam') {
        navigate('/settings#steam', { state: { activeTab: 'steam' } })
      }
    } else if (currentStep === 4) {
      // Step 4: Account settings
      if (location.pathname !== '/settings' || location.hash !== '#account') {
        navigate('/settings#account', { state: { activeTab: 'account' } })
      }
    }
  }, [isOpen, currentStep])

  if (!isOpen) return null

  if (isMinimized) {
    return (
      <div className="onboarding-overlay onboarding-overlay--minimized">
        <motion.button
          className="onboarding-minimized-pill"
          onClick={() => setIsMinimized(false)}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <div className="companion-pulse-dot" />
          <Bot size={16} className="companion-icon" />
          <span>
            {t('onboarding.statusCompanion', 'ИИ-Компаньон')} ({currentStep}/{totalSteps})
          </span>
          <Maximize2 size={14} className="minimized-expand-icon" />
        </motion.button>
      </div>
    )
  }

  return (
    <div className="onboarding-overlay">
      {/* Floating Interactive Guide Card */}
      <motion.div
        className="onboarding-card"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      >
        {/* Top Header: Companion Status & Actions */}
        <div className="onboarding-card__header">
          <div className="onboarding-companion-badge">
            <div className="companion-pulse-dot" />
            <Bot size={16} className="companion-icon" />
            <span>{t('onboarding.statusCompanion', 'ИИ-Компаньон онлайн')}</span>
          </div>

          <div className="onboarding-header-actions">
            <span className="onboarding-step-counter">
              {t('onboarding.stepCounter', {
                current: currentStep,
                total: totalSteps,
                defaultValue: `Шаг ${currentStep} из ${totalSteps}`
              })}
            </span>

            <button
              className="onboarding-icon-btn"
              onClick={() => setIsMinimized(true)}
              title={t('onboarding.btnMinimize', 'Свернуть')}
            >
              <Minimize2 size={15} />
            </button>

            <button
              className="onboarding-icon-btn onboarding-close-btn"
              onClick={skipTutorial}
              title={t('onboarding.btnSkip', 'Пропустить')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Slides */}
        <div className="onboarding-card__body">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                className="onboarding-slide"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="onboarding-hero-icon">
                  <div className="hero-icon-aura" />
                  <div className="hero-icon-core">
                    <Zap size={32} />
                  </div>
                </div>

                <div className="onboarding-badge-tag">
                  {t('onboarding.step1.badge', 'Добро пожаловать')}
                </div>

                <h2 className="onboarding-title">
                  {t('onboarding.step1.title', 'Ваш персональный игровой ИИ-компаньон')}
                </h2>

                <p className="onboarding-desc">
                  {t(
                    'onboarding.step1.description',
                    'GameMind создан, чтобы помочь вам исследовать игровую вселенную, понимать свои истинные предпочтения и всегда находить проекты, которые доставят максимум эмоций.'
                  )}
                </p>

                <p className="onboarding-subtext">
                  {t(
                    'onboarding.step1.subtext',
                    'Я буду сопровождать вас на каждом этапе: от анализа уже пройденных игр до поиска идеальных кооперативных приключений с друзьями.'
                  )}
                </p>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                className="onboarding-slide"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="onboarding-badge-tag">
                  {t('onboarding.step2.badge', 'Возможности')}
                </div>

                <h2 className="onboarding-title">
                  {t('onboarding.step2.title', 'Что умеет GameMind')}
                </h2>

                <div className="onboarding-features-list">
                  <div className="onboarding-feature-item">
                    <div className="feature-item-icon">
                      <Dna size={20} />
                    </div>
                    <div className="feature-item-text">
                      <h4>{t('onboarding.step2.featureDnaTitle', 'ДНК игрока')}</h4>
                      <p>
                        {t(
                          'onboarding.step2.featureDnaDesc',
                          'Глубокий анализ сотен игровых механик, жанров и динамики вашего вкуса.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="onboarding-feature-item">
                    <div className="feature-item-icon">
                      <Sparkles size={20} />
                    </div>
                    <div className="feature-item-text">
                      <h4>{t('onboarding.step2.featureRecsTitle', 'Умные рекомендации и ИИ-поиск')}</h4>
                      <p>
                        {t(
                          'onboarding.step2.featureRecsDesc',
                          'Поиск игр на естественном языке и персональные советы без лишнего шума.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="onboarding-feature-item">
                    <div className="feature-item-icon">
                      <Users size={20} />
                    </div>
                    <div className="feature-item-text">
                      <h4>{t('onboarding.step2.featureCoopTitle', 'Синхронизация с друзьями')}</h4>
                      <p>
                        {t(
                          'onboarding.step2.featureCoopDesc',
                          'Мгновенный подбор общих кооперативных игр на основе вкусов всей компании.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                className="onboarding-slide"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="onboarding-hero-icon hero-icon--key">
                  <div className="hero-icon-aura" />
                  <div className="hero-icon-core">
                    <Key size={30} />
                  </div>
                </div>

                <div className="onboarding-badge-tag">
                  {t('onboarding.step3.badge', 'Шаг 1 из 2 в настройках')}
                </div>

                <h2 className="onboarding-title">
                  {t('onboarding.step3.title', 'Подключение Steam')}
                </h2>

                <p className="onboarding-desc">
                  {t(
                    'onboarding.step3.description',
                    'Чтобы я мог изучить ваш игровой опыт, необходимо привязать ваш Steam ID и Steam Web API Key в разделе настроек.'
                  )}
                </p>

                <div className="onboarding-why-card">
                  <div className="why-card-title">
                    <ShieldCheck size={16} />
                    <span>{t('onboarding.step3.whyTitle', 'Зачем это нужно:')}</span>
                  </div>
                  <ul className="why-card-list">
                    <li>
                      {t(
                        'onboarding.step3.whyItem1',
                        'Загрузка списка всех ваших игр и точного времени прохождения.'
                      )}
                    </li>
                    <li>
                      {t(
                        'onboarding.step3.whyItem2',
                        'Анализ редких достижений и прогресса для формирования ДНК игрока.'
                      )}
                    </li>
                    <li>
                      {t(
                        'onboarding.step3.whyItem3',
                        'Все данные надежно шифруются и хранятся исключительно на вашем устройстве.'
                      )}
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                className="onboarding-slide"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="onboarding-hero-icon hero-icon--cloud">
                  <div className="hero-icon-aura" />
                  <div className="hero-icon-core">
                    <Cloud size={30} />
                  </div>
                </div>

                <div className="onboarding-badge-tag">
                  {t('onboarding.step4.badge', 'Шаг 2 из 2 в настройках')}
                </div>

                <h2 className="onboarding-title">
                  {t('onboarding.step4.title', 'Облачный аккаунт GameMind')}
                </h2>

                <p className="onboarding-desc">
                  {t(
                    'onboarding.step4.description',
                    'Для работы социальных функций и резервного копирования рекомендуется войти или создать бесплатный аккаунт GameMind.'
                  )}
                </p>

                <div className="onboarding-why-card">
                  <div className="why-card-title">
                    <Users size={16} />
                    <span>{t('onboarding.step4.whyTitle', 'Преимущества аккаунта:')}</span>
                  </div>
                  <ul className="why-card-list">
                    <li>
                      {t(
                        'onboarding.step4.whyItem1',
                        'Поиск и добавление друзей по уникальному 6-значному ID.'
                      )}
                    </li>
                    <li>
                      {t(
                        'onboarding.step4.whyItem2',
                        'Сравнение ДНК с друзьями и автоматический подбор совместных игр.'
                      )}
                    </li>
                    <li>
                      {t(
                        'onboarding.step4.whyItem3',
                        'Сквозная синхронизация профиля и прогресса между вашими устройствами.'
                      )}
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div
                key="step5"
                className="onboarding-slide"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="onboarding-hero-icon hero-icon--success">
                  <div className="hero-icon-aura" />
                  <div className="hero-icon-core">
                    <Check size={34} strokeWidth={3} />
                  </div>
                </div>

                <div className="onboarding-badge-tag">
                  {t('onboarding.step5.badge', 'Готово к работе')}
                </div>

                <h2 className="onboarding-title">
                  {t('onboarding.step5.title', 'Все готово к первому запуску')}
                </h2>

                <p className="onboarding-desc">
                  {t(
                    'onboarding.step5.description',
                    'Базовая настройка завершена. Теперь вы можете синхронизировать свою библиотеку Steam и сгенерировать первое ДНК игрока.'
                  )}
                </p>

                <p className="onboarding-subtext">
                  {t(
                    'onboarding.step5.subtext',
                    'Если захотите повторить обучение, вы всегда сможете запустить его в настройках внешнего вида.'
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step Indicator Dots & Navigation Actions */}
        <div className="onboarding-card__footer">
          <div className="onboarding-dots">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`onboarding-dot ${i + 1 === currentStep ? 'onboarding-dot--active' : i + 1 < currentStep ? 'onboarding-dot--passed' : ''}`}
              />
            ))}
          </div>

          <div className="onboarding-actions">
            {currentStep > 1 && (
              <button className="onboarding-btn-back" onClick={prevStep}>
                <ChevronLeft size={16} />
                <span>{t('onboarding.btnBack', 'Назад')}</span>
              </button>
            )}

            {currentStep < totalSteps ? (
              <button className="onboarding-btn-next" onClick={nextStep}>
                <span>{t('onboarding.btnNext', 'Далее')}</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button className="onboarding-btn-finish" onClick={completeTutorial}>
                <Gamepad2 size={18} />
                <span>{t('onboarding.btnFinish', 'Начать погружение')}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
