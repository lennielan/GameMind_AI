import { useState, useEffect } from 'react'
import { supabase } from '../../../services/supabase.client'
import { Cloud, LogOut, Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './CloudAuth.css'

export function CloudAuth(): React.JSX.Element {
  const { t } = useTranslation()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setError('Supabase credentials not configured in .env')
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session && supabase) {
        const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single()
        setUserProfile(data)
      }
      setLoading(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session && supabase) {
        window.api.cloud.setSession(session.access_token, session.refresh_token)
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => {
          setUserProfile(data)
        })
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    setAuthLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        if (!nickname.trim()) {
          throw new Error('Пожалуйста, введите никнейм')
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: nickname.trim()
            }
          }
        })
        if (error) throw error
        // If email confirmation is off, this returns a session immediately.
        if (data.session) {
          setShowSuccessModal(true)
        } else {
          setError('Регистрация успешна! (Проверьте email если включено подтверждение)')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        if (data.session) {
          setShowSuccessModal(true)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при авторизации')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    setAuthLoading(true)
    await supabase.auth.signOut()
    setUserProfile(null)
    setAuthLoading(false)
  }

  if (loading) {
    return (
      <div className="cloud-auth__loading">
        <Loader2 className="animate-spin" size={24} />
        <span>{t('cloudAuth.loading')}</span>
      </div>
    )
  }

  if (!supabase) {
    return (
      <div className="cloud-auth__error">
        <AlertCircle size={24} />
        <div>
          <h4>{t('cloudAuth.unavailableTitle')}</h4>
          <p>{t('cloudAuth.unavailableDesc')}</p>
        </div>
      </div>
    )
  }

  if (session) {
    const displayUsername = userProfile?.username || session.user?.user_metadata?.username || 'Без имени'
    const displayId = userProfile?.numeric_id

    return (
      <div className="cloud-auth__profile">
        {showSuccessModal && (
          <div className="cloud-auth__modal-overlay">
            <div className="cloud-auth__modal-content">
              <h3>{t('cloudAuth.welcome', { name: displayUsername })}</h3>
              <p>{t('cloudAuth.connectedSuccess')}</p>
              
              <div className="cloud-auth__modal-info">
                <div className="cloud-auth__modal-row">
                  <span>{t('cloudAuth.yourEmail')}</span>
                  <strong>{session.user.email}</strong>
                </div>
                <div className="cloud-auth__modal-row">
                  <span>{t('cloudAuth.yourId')}</span>
                  <strong style={{fontSize: '11px'}}>{session.user.id}</strong>
                </div>
                {displayId ? (
                  <div className="cloud-auth__modal-row cloud-auth__modal-row--highlight">
                    <span>{t('cloudAuth.friendCode')}</span>
                    <strong>#{displayId}</strong>
                  </div>
                ) : (
                  <div className="cloud-auth__modal-row cloud-auth__modal-row--warning">
                    <span>{t('cloudAuth.friendCode')}</span>
                    <strong>{t('cloudAuth.notGenerated')}</strong>
                  </div>
                )}
              </div>

              <button 
                className="cloud-auth__btn cloud-auth__btn--primary"
                onClick={() => setShowSuccessModal(false)}
              >
                {t('cloudAuth.btnOk')}
              </button>
            </div>
          </div>
        )}

        <div className="cloud-auth__header">
          <Cloud size={24} className="text-primary" />
          <div>
            <h4>{t('cloudAuth.connectedTo')}</h4>
            <p>{session.user.email}</p>
          </div>
        </div>
        
        <div className="cloud-auth__profile-info">
          <h3 className="cloud-auth__username">{displayUsername}</h3>
        </div>
        
        {displayId ? (
          <div className="cloud-auth__id-box">
            <span className="cloud-auth__id-label">{t('cloudAuth.friendCode')}</span>
            <div className="cloud-auth__id-value-group">
              <span className="cloud-auth__id-value">#{displayId}</span>
              <button 
                className="cloud-auth__btn cloud-auth__btn--small"
                onClick={() => navigator.clipboard.writeText(displayId.toString())}
              >
                {t('cloudAuth.copyCode')}
              </button>
            </div>
          </div>
        ) : (
          <div className="cloud-auth__id-box">
            <span className="cloud-auth__id-label" style={{color: '#fbbf24'}}>{t('cloudAuth.processingWarning')}</span>
          </div>
        )}

        <button 
          className="cloud-auth__btn cloud-auth__btn--outline"
          onClick={handleSignOut}
          disabled={authLoading}
        >
          {authLoading ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
          {t('cloudAuth.logout')}
        </button>
      </div>
    )
  }

  return (
    <div className="cloud-auth__form-container">
      <div className="cloud-auth__header">
        <Cloud size={24} className="text-primary" />
        <div>
          <h4>{t('cloudAuth.title')}</h4>
          <p>{t('cloudAuth.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleAuth} className="cloud-auth__form">
        {isSignUp && (
          <input
            type="text"
            placeholder={t('cloudAuth.nickname')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            className="cloud-auth__input"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="cloud-auth__input"
        />
        <input
          type="password"
          placeholder={t('cloudAuth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="cloud-auth__input"
        />
        
        {error && <div className="cloud-auth__error-msg">{error}</div>}

        <div className="cloud-auth__actions">
          <button 
            type="submit" 
            className="cloud-auth__btn cloud-auth__btn--primary"
            disabled={authLoading}
          >
            {authLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              isSignUp ? t('cloudAuth.btnRegister') : t('cloudAuth.btnLogin')
            )}
          </button>
          <button 
            type="button" 
            className="cloud-auth__btn cloud-auth__btn--ghost"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={authLoading}
          >
            {isSignUp ? t('cloudAuth.hasAccount') : t('cloudAuth.noAccount')}
          </button>
        </div>
      </form>
    </div>
  )
}
