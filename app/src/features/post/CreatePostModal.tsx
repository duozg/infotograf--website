import React, { useState, useRef, useCallback } from 'react';
import styles from './CreatePostModal.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const FILTERS = [
  { name: 'Normal', css: 'none' },
  { name: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
  { name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg)' },
  { name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', css: 'contrast(0.9) brightness(1.1) saturate(1.3)' },
  { name: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'Juno', css: 'sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)' },
  { name: 'Slumber', css: 'sepia(0.4) brightness(0.9) saturate(0.85)' },
  { name: 'Crema', css: 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9)' },
  { name: 'Ludwig', css: 'hue-rotate(-10deg) contrast(0.85) saturate(0.9)' },
  { name: 'Aden', css: 'sepia(0.2) brightness(1.15) saturate(0.85) hue-rotate(-20deg)' },
  { name: 'Perpetua', css: 'contrast(1.1) brightness(1.25) saturate(1.1)' },
  { name: 'Inkwell', css: 'grayscale(1)' },
  { name: 'Lo-Fi', css: 'saturate(1.1) contrast(1.5)' },
  { name: 'Nashville', css: 'sepia(0.4) contrast(1.2) brightness(1.05) saturate(1.2) hue-rotate(-15deg)' },
  { name: 'Kelvin', css: 'sepia(1) brightness(1.15) contrast(0.85)' },
];

type Step = 'upload' | 'filter' | 'caption' | 'sharing';

interface CreatePostModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreatePostModal({ onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('Normal');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback((selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const validFiles = Array.from(selected).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    setFiles(validFiles);
    const urls = validFiles.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    setStep('filter');
  }, []);

  const handleShare = useCallback(async () => {
    if (files.length === 0) return;
    setUploading(true);
    setStep('sharing');
    setError('');
    try {
      const form = new FormData();
      files.forEach(f => form.append('images', f));
      if (selectedFilter !== 'Normal') form.append('filterName', selectedFilter);
      if (caption.trim()) form.append('caption', caption.trim());
      if (location.trim()) form.append('locationName', location.trim());

      await api.upload('/posts', form);
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to share post');
      setStep('caption');
    } finally {
      setUploading(false);
    }
  }, [files, selectedFilter, caption, location, onSuccess, onClose]);

  const filterCss = FILTERS.find(f => f.name === selectedFilter)?.css || 'none';

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          {step === 'upload' ? (
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          ) : step === 'filter' ? (
            <button className={styles.closeBtn} onClick={() => setStep('upload')}>‹</button>
          ) : (
            <button className={styles.closeBtn} onClick={() => setStep('filter')}>‹</button>
          )}

          <span className={styles.modalTitle}>
            {step === 'upload' ? 'New Post' : step === 'filter' ? 'Filter' : step === 'caption' ? 'New Post' : 'Sharing…'}
          </span>

          {step === 'filter' ? (
            <button className={styles.shareBtn} onClick={() => setStep('caption')}>Next</button>
          ) : step === 'caption' ? (
            <button className={styles.shareBtn} onClick={handleShare} disabled={uploading}>Share</button>
          ) : (
            <div style={{ width: 60 }} />
          )}
        </div>

        {/* Step dots */}
        <div className={styles.stepDots}>
          {(['filter', 'caption', 'sharing'] as Step[]).map(s => (
            <div key={s} className={`${styles.stepDot} ${step === s ? styles.active : ''}`} />
          ))}
        </div>

        <div className={styles.content}>
          {step === 'upload' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
              />
              <div className={styles.uploadZone} onClick={() => fileInputRef.current?.click()}>
                <div className={styles.uploadIcon}>📷</div>
                <div className={styles.uploadText}>Select photos to share</div>
                <button
                  className={styles.uploadBtn}
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Choose Photos
                </button>
              </div>
            </>
          )}

          {step === 'filter' && previews.length > 0 && (
            <>
              {/* Preview */}
              <img
                src={previews[0]}
                alt=""
                className={styles.previewImage}
                style={{ filter: filterCss }}
              />
              {/* Multiple images strip */}
              {previews.length > 1 && (
                <div className={styles.multipleImages}>
                  {previews.map((p, i) => (
                    <img key={i} src={p} alt="" className={styles.thumbPreview} style={{ filter: filterCss }} />
                  ))}
                </div>
              )}
              {/* Filters */}
              <div className={styles.filtersRow}>
                {FILTERS.map(f => (
                  <div
                    key={f.name}
                    className={`${styles.filterItem} ${selectedFilter === f.name ? styles.selected : ''}`}
                    onClick={() => setSelectedFilter(f.name)}
                  >
                    <img
                      src={previews[0]}
                      alt={f.name}
                      className={styles.filterThumb}
                      style={{ filter: f.css }}
                    />
                    <span className={styles.filterName}>{f.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 'caption' && (
            <>
              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, padding: '16px 16px 0', overflow: 'hidden' }}>
                  {previews.map((p, i) => (
                    <img
                      key={i}
                      src={p}
                      alt=""
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 4,
                        filter: filterCss,
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className={styles.captionSection}>
                <Avatar src={user?.avatarUrl} username={user?.username} size="md" />
                <textarea
                  className={styles.captionInput}
                  placeholder="Write a caption…"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  maxLength={2200}
                />
              </div>
              <div className={styles.charCount}>{caption.length}/2200</div>

              <div className={styles.locationInput}>
                <span className={styles.locationIcon}>📍</span>
                <input
                  type="text"
                  placeholder="Add location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>

              {error && (
                <div style={{
                  margin: '12px 16px',
                  padding: '10px 12px',
                  background: 'rgba(237,73,86,0.1)',
                  border: '1px solid rgba(237,73,86,0.3)',
                  borderRadius: 4,
                  color: 'var(--accent-red)',
                  fontSize: 13,
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          {step === 'sharing' && (
            <div className={styles.uploading}>
              <div>Sharing your post…</div>
              <div className={styles.progress}>
                <div className={styles.progressBar} style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
