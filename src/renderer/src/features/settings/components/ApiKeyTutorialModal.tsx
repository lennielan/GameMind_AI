import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Sparkles, ShieldCheck, Info, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './ApiKeyTutorialModal.module.css'

interface ApiKeyTutorialModalProps {
  isOpen: boolean
  provider: string
  onClose: () => void
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
}

const FALLBACKS: Record<string, Record<string, string>> = {
  gemini: {
    badge: 'Google AI Studio',
    title: 'Инструкция: получение ключа Gemini',
    subtitle: 'Пошаговое руководство по созданию бесплатного API-ключа в Google AI Studio',
    step1Title: 'Шаг 1. Перейдите в Google AI Studio',
    step1Desc: 'Откройте портал разработчиков Google AI Studio и войдите под вашим Google-аккаунтом.',
    step1Hint: 'Если страница не открывается в вашей стране, может потребоваться использование VPN.',
    step1Action: 'Перейти на страницу API ключей',
    step2Title: 'Шаг 2. Создайте новый ключ',
    step2Desc: 'В левом меню или по центру экрана нажмите кнопку «Create API key» (или «Get API key»). Затем выберите пункт «Create API key in new project».',
    step3Title: 'Шаг 3. Скопируйте созданный ключ',
    step3Desc: 'В появившемся окне нажмите на иконку копирования рядом со строкой ключа (ключ начинается с префикса «AIza...»).',
    step4Title: 'Шаг 4. Вставьте ключ в GameMind',
    step4Desc: 'Вернитесь в настройки GameMind, вставьте ключ в поле «API Ключ» и нажмите кнопку «Сохранить изменения» внизу экрана.',
    benefitsTitle: 'Преимущества личного ключа:',
    benefit1: 'Полностью бесплатно: лимит 15 запросов в минуту и 1 000 000 токенов в сутки.',
    benefit2: 'Без банковских карт: Google не запрашивает платежные данные для тарифа Free Tier.',
    benefit3: 'Без очередей: персональная квота снимает любые лимиты GameMind на генерацию.',
    benefit4: 'Безопасность: ключ хранится строго на вашем ПК и не передается третьим лицам.',
    openStudioBtn: 'Открыть Google AI Studio',
    closeBtn: 'Понятно'
  },
  openai: {
    badge: 'OpenAI Platform',
    title: 'Инструкция: получение ключа OpenAI',
    subtitle: 'Пошаговое руководство по созданию API-ключа на платформе OpenAI Platform',
    step1Title: 'Шаг 1. Авторизуйтесь на OpenAI Platform',
    step1Desc: 'Откройте портал разработчиков OpenAI Platform и войдите в свой аккаунт (или зарегистрируйте новый).',
    step1Hint: 'Для доступа к OpenAI Platform в некоторых странах может потребоваться VPN.',
    step1Action: 'Перейти на страницу API ключей',
    step2Title: 'Шаг 2. Пополните баланс (Billing)',
    step2Desc: 'Обратите внимание: API OpenAI работает по отдельному балансу (подписка ChatGPT Plus не покрывает API). В разделе Settings -> Billing пополните счет минимум на $5 для активации запросов.',
    step3Title: 'Шаг 3. Создайте секретный ключ',
    step3Desc: 'Перейдите в раздел «API keys», нажмите кнопку «Create new secret key», укажите любое имя (например, GameMind) и нажмите «Create secret key».',
    step4Title: 'Шаг 4. Скопируйте и сохраните ключ',
    step4Desc: 'Сразу скопируйте ключ (начинается с «sk-...»), так как сервис показывает его только один раз. Вставьте его в поле «API Ключ» в настройках GameMind и сохраните изменения.',
    benefitsTitle: 'Особенности работы с OpenAI:',
    benefit1: 'Флагманские модели: доступ к интеллектуальным моделям GPT-4o и GPT-4o-mini.',
    benefit2: 'Оплата по факту: списываются только доли центов за использованные в генерациях токены.',
    benefit3: 'Максимальная стабильность: высокие серверные лимиты и приоритетная доступность.',
    benefit4: 'Безопасность: ключ хранится локально на вашем ПК в зашифрованном виде.',
    openStudioBtn: 'Открыть OpenAI Platform',
    closeBtn: 'Понятно'
  },
  claude: {
    badge: 'Anthropic Console',
    title: 'Инструкция: получение ключа Claude',
    subtitle: 'Пошаговое руководство по созданию API-ключа на платформе Anthropic Console',
    step1Title: 'Шаг 1. Авторизуйтесь в Anthropic Console',
    step1Desc: 'Перейдите на официальный портал разработчиков Anthropic Console и войдите в свой аккаунт (или зарегистрируйтесь).',
    step1Hint: 'Для доступа к Anthropic Console в некоторых странах может потребоваться VPN.',
    step1Action: 'Перейти на страницу API ключей',
    step2Title: 'Шаг 2. Пополните баланс (Plans & Billing)',
    step2Desc: 'Обратите внимание: API Anthropic работает по предоплате (Pay-as-you-go, подписка Claude Pro не включает в себя токены для API). В разделе Settings -> Plans & Billing пополните счет минимум на $5.',
    step3Title: 'Шаг 3. Создайте API-ключ',
    step3Desc: 'Перейдите в раздел «API Keys» в левом меню, нажмите оранжевую кнопку «Create Key», введите любое имя (например, GameMind) и подтвердите создание.',
    step4Title: 'Шаг 4. Скопируйте и вставьте ключ',
    step4Desc: 'Скопируйте полученный ключ (начинается с «sk-ant-api03-...»), вставьте его в поле «API Ключ» в настройках GameMind и нажмите «Сохранить изменения» внизу экрана.',
    benefitsTitle: 'Особенности работы с Claude:',
    benefit1: 'Передовой интеллект: доступ к флагманским моделям Claude 3.5 Sonnet с непревзойденным качеством анализа.',
    benefit2: 'Оплата по факту: списываются только доли центов строго за сгенерированные ответы.',
    benefit3: 'Глубокий контекст: огромное контекстное окно для детального разбора вашей игровой библиотеки.',
    benefit4: 'Безопасность: ключ хранится исключительно локально на вашем ПК в зашифрованном виде.',
    openStudioBtn: 'Открыть Anthropic Console',
    closeBtn: 'Понятно'
  },
  openrouter: {
    badge: 'OpenRouter AI',
    title: 'Инструкция: получение ключа OpenRouter',
    subtitle: 'Пошаговое руководство по созданию единого API-ключа на платформе OpenRouter',
    step1Title: 'Шаг 1. Войдите на платформу OpenRouter',
    step1Desc: 'Откройте сайт openrouter.ai/keys и авторизуйтесь через Google, Discord, GitHub или электронную почту.',
    step1Hint: 'OpenRouter объединяет сотни моделей от разных разработчиков (DeepSeek, Meta, OpenAI, Google) через один ключ.',
    step1Action: 'Перейти на страницу API ключей',
    step2Title: 'Шаг 2. Выберите модели или пополните баланс',
    step2Desc: 'На OpenRouter есть как множество бесплатных моделей (:free), так и премиальных. Для доступа к премиум-моделям можно пополнить баланс в разделе Credits на любую удобную сумму.',
    step3Title: 'Шаг 3. Создайте новый API-ключ',
    step3Desc: 'В разделе «Keys» нажмите кнопку «Create Key», укажите имя ключа (например, GameMind), при желании задайте лимит расходов и нажмите «Create».',
    step4Title: 'Шаг 4. Скопируйте и сохраните ключ',
    step4Desc: 'Скопируйте сгенерированный ключ (начинается с «sk-or-v1-...»), вставьте его в поле «API Ключ» в GameMind и сохраните изменения.',
    benefitsTitle: 'Преимущества OpenRouter:',
    benefit1: 'Единый доступ: один ключ открывает DeepSeek, Llama 3.3, Claude, GPT-4o и сотни других моделей.',
    benefit2: 'Бесплатные модели: доступ к ряду качественных нейросетей без необходимости пополнения счета.',
    benefit3: 'Удобная оплата: поддержка пополнения баланса зарубежными картами и криптовалютой.',
    benefit4: 'Безопасность: ключ хранится локально на вашем ПК и используется только для запросов.',
    openStudioBtn: 'Открыть OpenRouter',
    closeBtn: 'Понятно'
  },
  ollama: {
    badge: 'Ollama Local',
    title: 'Инструкция: подключение Ollama',
    subtitle: 'Пошаговое руководство по установке и локальному запуску моделей через Ollama',
    step1Title: 'Шаг 1. Скачайте и установите Ollama',
    step1Desc: 'Перейдите на официальный сайт ollama.com, скачайте установщик для вашей операционной системы и завершите установку.',
    step1Hint: 'Ollama позволяет запускать открытые нейросети прямо на процессоре или видеокарте вашего ПК.',
    step1Action: 'Перейти на сайт Ollama',
    step2Title: 'Шаг 2. Загрузите желаемую модель',
    step2Desc: 'Откройте командную строку (PowerShell или CMD) и выполните команду: ollama run llama3.2 (или ollama run mistral / ollama run qwen2.5).',
    step3Title: 'Шаг 3. Убедитесь в работе сервера',
    step3Desc: 'Сервер Ollama запускается автоматически в фоновом режиме и доступен по адресу http://localhost:11434.',
    step4Title: 'Шаг 4. Укажите адрес в GameMind',
    step4Desc: 'Введите адрес http://localhost:11434 в поле «URL локального сервера» и нажмите кнопку «Сохранить изменения» внизу экрана.',
    benefitsTitle: 'Преимущества Ollama:',
    benefit1: '100% бесплатно и офлайн: не требует интернета и подписок.',
    benefit2: 'Полная приватность: ваши данные никогда не покидают компьютер.',
    benefit3: 'Без лимитов: неограниченное число запросов и токенов.',
    benefit4: 'Огромный выбор: поддержка Llama 3, Mistral, Qwen, Gemma и других.',
    openStudioBtn: 'Скачать Ollama',
    closeBtn: 'Понятно'
  },
  lmstudio: {
    badge: 'LM Studio Local',
    title: 'Инструкция: подключение LM Studio',
    subtitle: 'Пошаговое руководство по установке и запуску локального сервера LM Studio',
    step1Title: 'Шаг 1. Скачайте и установите LM Studio',
    step1Desc: 'Откройте официальный сайт lmstudio.ai, скачайте приложение и установите его на ваш ПК.',
    step1Hint: 'LM Studio предоставляет удобный графический интерфейс для скачивания и управления открытыми моделями.',
    step1Action: 'Перейти на сайт LM Studio',
    step2Title: 'Шаг 2. Скачайте модель через поиск',
    step2Desc: 'В поиске внутри приложения LM Studio найдите и загрузите любую подходящую модель (например, Llama 3.2 3B, Qwen 2.5 7B или Mistral 7B).',
    step3Title: 'Шаг 3. Запустите локальный сервер',
    step3Desc: 'Перейдите на вкладку «Local Server» (иконка со стрелками в левом меню), выберите загруженную модель вверху и нажмите кнопку «Start Server» (порт по умолчанию: 1234).',
    step4Title: 'Шаг 4. Укажите адрес в GameMind',
    step4Desc: 'Убедитесь, что в поле «URL локального сервера» указан адрес http://localhost:1234, и нажмите кнопку «Сохранить изменения».',
    benefitsTitle: 'Преимущества LM Studio:',
    benefit1: 'Удобный интерфейс: поиск, загрузка и запуск нейросетей в пару кликов.',
    benefit2: 'Полная автономность: генерации выполняются на мощностях вашей видеокарты.',
    benefit3: 'Без оплаты: никаких ключей, подписок и ограничений по квотам.',
    benefit4: 'OpenAI-совместимость: стандартный локальный REST API протокол.',
    openStudioBtn: 'Скачать LM Studio',
    closeBtn: 'Понятно'
  }
}

export function ApiKeyTutorialModal({
  isOpen,
  provider,
  onClose
}: ApiKeyTutorialModalProps): React.JSX.Element | null {
  const { t } = useTranslation()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeProvider = ['gemini', 'openai', 'claude', 'openrouter', 'ollama', 'lmstudio'].includes(provider) ? provider : 'gemini'
  const fallback = FALLBACKS[activeProvider] || FALLBACKS.gemini

  const handleOpenStudio = (): void => {
    if (activeProvider === 'gemini') {
      window.api.openExternal('https://aistudio.google.com/app/apikey')
    } else if (activeProvider === 'openai') {
      window.api.openExternal('https://platform.openai.com/api-keys')
    } else if (activeProvider === 'claude') {
      window.api.openExternal('https://console.anthropic.com/settings/keys')
    } else if (activeProvider === 'openrouter') {
      window.api.openExternal('https://openrouter.ai/keys')
    } else if (activeProvider === 'ollama') {
      window.api.openExternal('https://ollama.com')
    } else if (activeProvider === 'lmstudio') {
      window.api.openExternal('https://lmstudio.ai')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-tutorial-title"
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <div className={styles.eyebrowBadge}>
                  <Sparkles size={13} className={styles.eyebrowIcon} />
                  <span>{t(`settings.ai.tutorial.${activeProvider}.badge`, fallback.badge)}</span>
                </div>
                <h3 id="api-tutorial-title" className={styles.title}>
                  {t(`settings.ai.tutorial.${activeProvider}.title`, fallback.title)}
                </h3>
                <p className={styles.subtitle}>
                  {t(`settings.ai.tutorial.${activeProvider}.subtitle`, fallback.subtitle)}
                </p>
              </div>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label={t('common.close', 'Закрыть')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.body}>
              <div className={styles.stepsContainer}>
                {/* Step 1 */}
                <div className={styles.stepCard}>
                  <div className={styles.stepNumberBadge}>1</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>
                      {t(`settings.ai.tutorial.${activeProvider}.step1Title`, fallback.step1Title)}
                    </h4>
                    <p className={styles.stepDesc}>
                      {t(`settings.ai.tutorial.${activeProvider}.step1Desc`, fallback.step1Desc)}
                    </p>
                    <div className={styles.stepHintBox}>
                      <Info size={14} className={styles.stepHintIcon} />
                      <span>{t(`settings.ai.tutorial.${activeProvider}.step1Hint`, fallback.step1Hint)}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.stepActionBtn}
                      onClick={handleOpenStudio}
                    >
                      <ExternalLink size={14} />
                      <span>{t(`settings.ai.tutorial.${activeProvider}.step1Action`, fallback.step1Action)}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className={styles.stepCard}>
                  <div className={styles.stepNumberBadge}>2</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>
                      {t(`settings.ai.tutorial.${activeProvider}.step2Title`, fallback.step2Title)}
                    </h4>
                    <p className={styles.stepDesc}>
                      {t(`settings.ai.tutorial.${activeProvider}.step2Desc`, fallback.step2Desc)}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className={styles.stepCard}>
                  <div className={styles.stepNumberBadge}>3</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>
                      {t(`settings.ai.tutorial.${activeProvider}.step3Title`, fallback.step3Title)}
                    </h4>
                    <p className={styles.stepDesc}>
                      {t(`settings.ai.tutorial.${activeProvider}.step3Desc`, fallback.step3Desc)}
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className={styles.stepCard}>
                  <div className={styles.stepNumberBadge}>4</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>
                      {t(`settings.ai.tutorial.${activeProvider}.step4Title`, fallback.step4Title)}
                    </h4>
                    <p className={styles.stepDesc}>
                      {t(`settings.ai.tutorial.${activeProvider}.step4Desc`, fallback.step4Desc)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits Card */}
              <div className={styles.benefitsCard}>
                <div className={styles.benefitsHeader}>
                  <ShieldCheck size={16} />
                  <span>{t(`settings.ai.tutorial.${activeProvider}.benefitsTitle`, fallback.benefitsTitle)}</span>
                </div>
                <div className={styles.benefitsGrid}>
                  <div className={styles.benefitItem}>
                    <CheckCircle2 size={14} className={styles.benefitIcon} />
                    <span>{t(`settings.ai.tutorial.${activeProvider}.benefit1`, fallback.benefit1)}</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <CheckCircle2 size={14} className={styles.benefitIcon} />
                    <span>{t(`settings.ai.tutorial.${activeProvider}.benefit2`, fallback.benefit2)}</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <CheckCircle2 size={14} className={styles.benefitIcon} />
                    <span>{t(`settings.ai.tutorial.${activeProvider}.benefit3`, fallback.benefit3)}</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <CheckCircle2 size={14} className={styles.benefitIcon} />
                    <span>{t(`settings.ai.tutorial.${activeProvider}.benefit4`, fallback.benefit4)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onClose}
              >
                {t(`settings.ai.tutorial.${activeProvider}.closeBtn`, fallback.closeBtn)}
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleOpenStudio}
              >
                <ExternalLink size={15} />
                <span>{t(`settings.ai.tutorial.${activeProvider}.openStudioBtn`, fallback.openStudioBtn)}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
