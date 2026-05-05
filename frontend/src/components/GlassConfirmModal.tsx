import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './glassConfirmModal.css';

export interface ConfirmModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Title shown at the top of the modal */
  title?: string;
  /** Description / body message */
  message: string;
  /** Label for the confirm button (default: "Подтвердить") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Отмена") */
  cancelLabel?: string;
  /** Visual variant — controls confirm button colour */
  variant?: 'danger' | 'warning' | 'info';
  /** Icon shown above the title (emoji or small SVG string) */
  icon?: React.ReactNode;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user cancels or presses Escape */
  onCancel: () => void;
}

const VARIANT_STYLES: Record<
  string,
  { btnBg: string; btnHover: string; iconBg: string; iconColor: string; glow: string }
> = {
  danger: {
    btnBg: 'linear-gradient(135deg, rgba(220,38,38,0.85), rgba(239,68,68,0.75))',
    btnHover: 'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(239,68,68,0.88))',
    iconBg: 'var(--error-soft)',
    iconColor: 'var(--error)',
    glow: '0 4px 20px rgba(220,38,38,0.3)',
  },
  warning: {
    btnBg: 'linear-gradient(135deg, rgba(217,119,6,0.85), rgba(245,158,11,0.75))',
    btnHover: 'linear-gradient(135deg, rgba(217,119,6,0.95), rgba(245,158,11,0.88))',
    iconBg: 'var(--warning-soft)',
    iconColor: 'var(--warning)',
    glow: '0 4px 20px rgba(217,119,6,0.3)',
  },
  info: {
    btnBg: 'linear-gradient(135deg, rgba(37,99,235,0.85), rgba(99,102,241,0.8))',
    btnHover: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(99,102,241,0.9))',
    iconBg: 'var(--accent-soft)',
    iconColor: 'var(--accent)',
    glow: '0 4px 20px var(--accent-glow)',
  },
};

export default function GlassConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'danger',
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const v = VARIANT_STYLES[variant] ?? VARIANT_STYLES.danger;

  // Trap focus & close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    // Auto-focus the confirm button for keyboard users
    requestAnimationFrame(() => confirmBtnRef.current?.focus());
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="gcm-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Подтверждение'}
    >
      <div className="gcm-panel" onClick={(e) => e.stopPropagation()}>
        {/* Specular shine */}
        <div className="gcm-shine" />

        {/* Icon */}
        {icon && (
          <div className="gcm-icon" style={{ background: v.iconBg, color: v.iconColor }}>
            {icon}
          </div>
        )}

        {/* Title */}
        {title && <h3 className="gcm-title">{title}</h3>}

        {/* Message */}
        <p className="gcm-message">{message}</p>

        {/* Buttons */}
        <div className="gcm-actions">
          <button type="button" className="gcm-btn gcm-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="gcm-btn gcm-btn-confirm"
            style={{
              background: hovered ? v.btnHover : v.btnBg,
              boxShadow: hovered ? v.glow : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────────────────────────────────────────────────
   Hook helper — wraps any async action with a confirm
   dialog so you don't have to manage state manually
   every time.
   Usage:
     const [confirmProps, requestConfirm] = useConfirm();
     ...
     <GlassConfirmModal {...confirmProps} />
     ...
     requestConfirm({ title: '...', message: '...', onConfirm: () => doSomething() });
   ─────────────────────────────────────────────────────── */
export interface UseConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  onConfirm: () => void;
}

export function useConfirm() {
  const [state, setState] = useState<(UseConfirmOptions & { open: boolean }) | null>(null);

  const requestConfirm = useCallback((opts: UseConfirmOptions) => {
    setState({ ...opts, open: true });
  }, []);

  const handleCancel = useCallback(() => {
    setState(null);
  }, []);

  const handleConfirm = useCallback(() => {
    state?.onConfirm();
    setState(null);
  }, [state]);

  const confirmProps: ConfirmModalProps = {
    open: !!state?.open,
    title: state?.title,
    message: state?.message ?? '',
    confirmLabel: state?.confirmLabel,
    cancelLabel: state?.cancelLabel,
    variant: state?.variant,
    icon: state?.icon,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return [confirmProps, requestConfirm] as const;
}
