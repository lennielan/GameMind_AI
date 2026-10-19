// ============================================================
// AvatarCropper — Local file crop & preview component
// ============================================================

import { useState, useCallback } from 'react'
import _Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

const Cropper = _Cropper as any
import { Upload, X, Check, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './AvatarCropper.css'

interface AvatarCropperProps {
  currentAvatar: string | null
  username: string
  onSave: (avatarFileUrl: string) => void
}

// Creates a canvas crop from a base64 image
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const size = 256
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  )

  return canvas.toDataURL('image/webp', 0.85)
}

export function AvatarCropper({ currentAvatar, username, onSave }: AvatarCropperProps): React.JSX.Element {
  const { t } = useTranslation()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleSelectFile = async () => {
    try {
      const res = await window.api.avatar.selectFile()
      if (res.success && res.data) {
        setImageSrc(res.data)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
      }
    } catch (e) {
      console.error('Failed to select avatar file:', e)
    }
  }

  const handleCancel = () => {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsSaving(true)
    try {
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels)
      // Save locally for cache, but use the base64 string for cloud sync
      await window.api.avatar.save(croppedBase64)
      onSave(croppedBase64)
      setImageSrc(null)
    } catch (e) {
      console.error('Failed to save avatar:', e)
    } finally {
      setIsSaving(false)
    }
  }

  // Crop mode
  if (imageSrc) {
    return (
      <div className="avatar-cropper">
        <div className="avatar-cropper__viewport">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="avatar-cropper__controls">
          <div className="avatar-cropper__zoom">
            <ZoomOut size={16} />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="avatar-cropper__slider"
            />
            <ZoomIn size={16} />
          </div>

          <div className="avatar-cropper__actions">
            <button className="avatar-cropper__btn avatar-cropper__btn--cancel" onClick={handleCancel}>
              <X size={16} /> {t('common.cancel', 'Отмена')}
            </button>
            <button className="avatar-cropper__btn avatar-cropper__btn--save" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
              {t('common.save', 'Сохранить')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Preview mode
  return (
    <div className="avatar-cropper avatar-cropper--preview">
      <div
        className="avatar-cropper__preview"
        onClick={handleSelectFile}
        title={t('ui.avatar.clickToSelect', 'Нажмите, чтобы выбрать фото')}
      >
        {currentAvatar && !currentAvatar.startsWith('file://') ? (
          <img src={currentAvatar} alt={username} />
        ) : (
          <span className="avatar-cropper__letter">{username?.charAt(0)?.toUpperCase()}</span>
        )}
        <div className="avatar-cropper__overlay">
          <Upload size={20} />
        </div>
      </div>
      <button className="avatar-cropper__upload-btn" onClick={handleSelectFile}>
        <Upload size={14} />
        <span>{t('ui.avatar.uploadPhoto', 'Загрузить фото')}</span>
      </button>
    </div>
  )
}
