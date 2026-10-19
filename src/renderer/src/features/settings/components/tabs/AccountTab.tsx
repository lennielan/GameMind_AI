import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cloud,
  Loader2,
  LogOut,
  CheckCircle2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Dna,
  Award,
  Users,
  AlertCircle,
  LogIn,
  UserPlus,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../../services/supabase.client'
import styles from '../../SettingsPage.module.css'
import authStyles from './AccountTab.module.css'

interface AccountTabProps {
  session: any
  profile: any
  fadeUp: any
  onNavigateTab?: (tab: string) => void
}

export function AccountTab({ session, profile, fadeUp, onNavigateTab }: AccountTabProps) {
  const { t } = useTranslation()
  const [authLoading, setAuthLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setError(t('cloudAuth.unavailableDesc', 'Пожалуйста, настройте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файле .env'))
      return
    }

    setError(null)

    const trimmedEmail = email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (isSignUp) {
      const trimmedNickname = nickname.trim()
      if (!trimmedNickname) {
        setError(t('auth.errors.emptyNickname', 'Пожалуйста, введите никнейм'))
        return
      }
      if (trimmedNickname.length < 3 || trimmedNickname.length > 20) {
        setError(t('settings.profile.errorLength', 'Никнейм должен содержать от 3 до 20 символов'))
        return
      }
    }

    if (!trimmedEmail) {
      setError(t('auth.errors.emptyEmail', 'Пожалуйста, введите адрес электронной почты'))
      return
    }
    if (!emailRegex.test(trimmedEmail)) {
      setError(
        t(
          'auth.errors.invalidEmail',
          'Пожалуйста, укажите корректный адрес электронной почты (например, name@example.com)'
        )
      )
      return
    }

    if (!password) {
      setError(t('auth.errors.emptyPassword', 'Пожалуйста, введите пароль'))
      return
    }
    if (isSignUp && password.length < 6) {
      setError(t('auth.errors.passwordTooShort', 'Пароль должен содержать не менее 6 символов'))
      return
    }

    setAuthLoading(true)

    try {
      if (isSignUp) {
        const trimmedNickname = nickname.trim()
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              username: trimmedNickname
            }
          }
        })

        // Handle error when duplicate email is detected (enumeration protection OFF)
        if (signUpError) {
          if (
            signUpError.message.toLowerCase().includes('already registered') ||
            (signUpError as any).code === 'user_already_exists'
          ) {
            throw new Error(
              t(
                'auth.errors.emailTaken',
                'Этот email уже зарегистрирован. Пожалуйста, войдите в аккаунт.'
              )
            )
          }
          throw signUpError
        }

        // Handle case where duplicate email exists and Supabase enumeration protection is ON
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error(
            t(
              'auth.errors.emailTaken',
              'Этот email уже зарегистрирован. Пожалуйста, войдите в аккаунт.'
            )
          )
        }

        if (data.session) {
          setShowSuccessModal(true)
        } else {
          setError(
            t(
              'auth.errors.registrationSuccess',
              'Регистрация успешна! (Проверьте email если включено подтверждение)'
            )
          )
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        })
        if (signInError) throw signInError
        if (data.session) {
          setShowSuccessModal(true)
        }
      }
    } catch (err: any) {
      setError(err.message || t('auth.errors.genericError', 'Произошла ошибка при авторизации'))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    setAuthLoading(true)
    try {
      await supabase.auth.signOut()
      window.api.cloud.clearSession()
      localStorage.removeItem('cached_app_profile')
      setShowSuccessModal(false)
    } catch (err) {
      console.error(err)
    } finally {
      setAuthLoading(false)
    }
  }

  const copyFriendCode = (code: string | number) => {
    navigator.clipboard.writeText(code.toString())
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const displayUsername =
    profile?.username || session?.user?.email?.split('@')[0] || t('cloudAuth.loading', 'Загрузка...')
  const displayId = profile?.numeric_id

  // ----------------------------------------------------
  // LOGGED IN VIEW
  // ----------------------------------------------------
  if (session) {
    return (
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <Cloud size={20} />
          <h2>{t('cloudAuth.title', 'Аккаунт GameMind')}</h2>
        </div>

        {showSuccessModal && (
          <div className={authStyles.successBanner}>
            <CheckCircle2 size={20} className={authStyles.successIcon} />
            <div className={authStyles.successContent}>
              <h4>{t('cloudAuth.successTitle', 'Вход выполнен успешно!')}</h4>
              <p>{t('cloudAuth.successDesc', 'Ваш профиль и данные синхронизированы с облаком.')}</p>
            </div>
            <button className={authStyles.bannerCloseBtn} onClick={() => setShowSuccessModal(false)}>
              {t('cloudAuth.btnOk', 'Отлично')}
            </button>
          </div>
        )}

        {/* User Card */}
        <div className={authStyles.profileOverviewCard}>
          <div className={authStyles.profileAvatarArea}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className={authStyles.avatarImg} />
            ) : (
              <div className={authStyles.avatarFallback}>
                {displayUsername.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={authStyles.statusIndicatorDot} />
          </div>

          <div className={authStyles.profileDetails}>
            <div className={authStyles.profileTopRow}>
              <h3 className={authStyles.profileName}>{displayUsername}</h3>
              <span className={authStyles.statusBadge}>
                {t('cloudAuth.statusActive', 'Активен и подключен')}
              </span>
            </div>
            <p className={authStyles.profileEmail}>{session.user.email}</p>
          </div>
        </div>

        {/* Friend Code & System Info */}
        <div className={authStyles.friendCodeCard}>
          <div className={authStyles.friendCodeHeader}>
            <div className={authStyles.friendCodeIconBadge}>
              <Users size={18} />
            </div>
            <div>
              <div className={authStyles.friendCodeLabel}>{t('cloudAuth.friendCode', 'Код для друзей')}</div>
              <div className={authStyles.friendCodeHint}>
                {t('cloudAuth.subtitle', 'Используйте этот код, чтобы друзья могли быстро найти ваш профиль.')}
              </div>
            </div>
          </div>

          <div className={authStyles.friendCodeValueGroup}>
            <span className={authStyles.friendCodeNumber}>#{displayId || '...'}</span>
            {displayId && (
              <button
                className={`${authStyles.copyBtn} ${copiedCode ? authStyles.copyBtnSuccess : ''}`}
                onClick={() => copyFriendCode(displayId)}
              >
                {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedCode ? t('cloudAuth.copied', 'Скопировано!') : t('cloudAuth.copyCode', 'Скопировать')}</span>
              </button>
            )}
          </div>

          {!displayId && (
            <div className={authStyles.processingWarning}>
              {t('cloudAuth.processingWarning', 'Ваш профиль обрабатывается...')}
            </div>
          )}
        </div>

        {/* Quick Navigation Links */}
        <div className={authStyles.quickActionsGrid}>
          <div
            className={authStyles.quickActionCard}
            onClick={() => onNavigateTab && onNavigateTab('profile')}
          >
            <div className={authStyles.quickActionIcon}>
              <User size={18} />
            </div>
            <div className={authStyles.quickActionInfo}>
              <h4>{t('settings.profile.title', 'Мой профиль')}</h4>
              <p>{t('cloudAuth.profileSettingsLink', 'Настройка никнейма, аватара и приватности')}</p>
            </div>
            <ArrowRight size={16} className={authStyles.quickActionArrow} />
          </div>

          <div
            className={authStyles.quickActionCard}
            onClick={() => onNavigateTab && onNavigateTab('badges')}
          >
            <div className={authStyles.quickActionIcon}>
              <Award size={18} />
            </div>
            <div className={authStyles.quickActionInfo}>
              <h4>{t('badges.settings.title', 'Значки профиля')}</h4>
              <p>{t('cloudAuth.badgesSettingsLink', 'Выбор значков для публичной витрины наград')}</p>
            </div>
            <ArrowRight size={16} className={authStyles.quickActionArrow} />
          </div>
        </div>

        {/* Logout Section */}
        <div className={authStyles.logoutSection}>
          <button className={authStyles.logoutBtn} onClick={handleSignOut} disabled={authLoading}>
            {authLoading ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
            <span>{t('cloudAuth.logout', 'Выйти из аккаунта')}</span>
          </button>
        </div>
      </motion.section>
    )
  }

  // ----------------------------------------------------
  // LOGGED OUT VIEW (LOGIN / REGISTER FORM)
  // ----------------------------------------------------
  return (
    <motion.section className={styles.settingsSection} variants={fadeUp}>
      <div className={styles.settingsSectionHeader}>
        <Cloud size={20} />
        <h2>{t('cloudAuth.title', 'Аккаунт GameMind')}</h2>
      </div>

      {!supabase && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '6px',
          color: '#f87171',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{t('cloudAuth.unavailableDesc', 'Пожалуйста, настройте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файле .env')}</span>
        </div>
      )}

      {/* Hero Overview Banner */}
      <div className={authStyles.authHeroBanner}>
        <div className={authStyles.heroTopRow}>
          <div className={authStyles.heroIconBadge}>
            <Cloud size={22} />
          </div>
          <div className={authStyles.heroText}>
            <h3 className={authStyles.heroTitle}>
              {t('cloudAuth.heroTitle', 'Единый профиль GameMind')}
            </h3>
            <p className={authStyles.heroDesc}>
              {t(
                'cloudAuth.heroDesc',
                'Авторизуйтесь или создайте аккаунт, чтобы объединить статистику, сохранять Player DNA в облаке и находить напарников для кооператива.'
              )}
            </p>
          </div>
        </div>

        <div className={authStyles.benefitsGrid}>
          <div className={authStyles.benefitCard}>
            <div className={authStyles.benefitIcon}>
              <Dna size={16} />
            </div>
            <div className={authStyles.benefitContent}>
              <span className={authStyles.benefitTitle}>
                {t('cloudAuth.benefit1Title', 'Player DNA в облаке')}
              </span>
              <span className={authStyles.benefitDesc}>
                {t('cloudAuth.benefit1Desc', 'Синхронизация вкусов между устройствами')}
              </span>
            </div>
          </div>

          <div className={authStyles.benefitCard}>
            <div className={authStyles.benefitIcon}>
              <Award size={16} />
            </div>
            <div className={authStyles.benefitContent}>
              <span className={authStyles.benefitTitle}>
                {t('cloudAuth.benefit2Title', 'Значки и ранги')}
              </span>
              <span className={authStyles.benefitDesc}>
                {t('cloudAuth.benefit2Desc', 'Прокачка ранга и витрина наград')}
              </span>
            </div>
          </div>

          <div className={authStyles.benefitCard}>
            <div className={authStyles.benefitIcon}>
              <Users size={16} />
            </div>
            <div className={authStyles.benefitContent}>
              <span className={authStyles.benefitTitle}>
                {t('cloudAuth.benefit3Title', 'Друзья и чаты')}
              </span>
              <span className={authStyles.benefitDesc}>
                {t('cloudAuth.benefit3Desc', 'Поиск напарников по схожести вкусов')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Auth Form Container */}
      <div className={authStyles.formSectionContainer}>
        {/* Segmented Control */}
        <div className={authStyles.segmentedTabs}>
          <button
            type="button"
            className={`${authStyles.segmentedBtn} ${!isSignUp ? authStyles.segmentedBtnActive : ''}`}
            onClick={() => {
              setIsSignUp(false)
              setError(null)
            }}
          >
            <LogIn size={16} />
            <span>{t('cloudAuth.loginTab', 'Вход в аккаунт')}</span>
          </button>
          <button
            type="button"
            className={`${authStyles.segmentedBtn} ${isSignUp ? authStyles.segmentedBtnActive : ''}`}
            onClick={() => {
              setIsSignUp(true)
              setError(null)
            }}
          >
            <UserPlus size={16} />
            <span>{t('cloudAuth.registerTab', 'Создать аккаунт')}</span>
          </button>
        </div>

        <form onSubmit={handleAuth} noValidate className={authStyles.nativeForm}>
          {/* Nickname (Only in Sign Up) */}
          {isSignUp && (
            <div className={styles.settingsField}>
              <label className={styles.settingsLabel}>
                <span className={authStyles.fieldLabelWithIcon}>
                  <User size={15} />
                  {t('cloudAuth.nickname', 'Никнейм игрока')}
                </span>
              </label>
              <input
                type="text"
                placeholder={t('cloudAuth.nicknamePlaceholder', 'Ваш игровой никнейм')}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                className={styles.settingsInput}
              />
              <p className={styles.settingsHint}>
                {t('cloudAuth.nicknameHint', 'От 3 до 20 символов (буквы, цифры, пробелы, дефис)')}
              </p>
            </div>
          )}

          {/* Email */}
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>
              <span className={authStyles.fieldLabelWithIcon}>
                <Mail size={15} />
                {t('cloudAuth.emailLabel', 'Электронная почта')}
              </span>
            </label>
            <input
              type="email"
              placeholder={t('cloudAuth.emailPlaceholder', 'name@example.com')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.settingsInput}
            />
          </div>

          {/* Password */}
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>
              <span className={authStyles.fieldLabelWithIcon}>
                <Lock size={15} />
                {t('cloudAuth.password', 'Пароль')}
              </span>
            </label>
            <div className={styles.settingsInputGroup}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('cloudAuth.passwordPlaceholder', 'Введите ваш пароль')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={styles.settingsInput}
              />
              <button
                type="button"
                className={styles.settingsInputToggle}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? t('cloudAuth.hidePassword', 'Скрыть пароль') : t('cloudAuth.showPassword', 'Показать пароль')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isSignUp && (
              <p className={styles.settingsHint}>
                {t('cloudAuth.passwordHint', 'Минимум 6 символов')}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={authStyles.errorAlert}
            >
              <AlertCircle size={18} className={authStyles.errorIcon} />
              <div className={authStyles.errorText}>{error}</div>
            </motion.div>
          )}

          {/* Submit CTA Button */}
          <button
            type="submit"
            className={authStyles.submitCtaBtn}
            disabled={authLoading}
          >
            {authLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isSignUp ? (
              <>
                <UserPlus size={18} />
                <span>{t('cloudAuth.btnRegister', 'Зарегистрироваться')}</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>{t('cloudAuth.btnLogin', 'Войти в аккаунт')}</span>
              </>
            )}
          </button>

          <p className={authStyles.disclaimerHint}>
            {t(
              'cloudAuth.termsHint',
              'Авторизуясь, вы подключаетесь к единой облачной экосистеме GameMind AI.'
            )}
          </p>
        </form>
      </div>
    </motion.section>
  )
}
