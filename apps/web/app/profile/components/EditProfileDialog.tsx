'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from '@/app/lib/design-system';
import { CornerMarkers } from '@/app/lib/design-primitives';

export interface ProfileFormValues {
  name: string;
  bio?: string;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  submitting: boolean;
  errorMessage?: string | null;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  submitting,
  errorMessage,
}: EditProfileDialogProps) {
  const [formValues, setFormValues] = useState<ProfileFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setFormValues(initialValues);
    }
  }, [open, initialValues]);

  const handleChange = (field: keyof ProfileFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormValues((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(formValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          color: C.text,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 22,
              fontWeight: 200,
              color: C.text,
              letterSpacing: '-0.01em',
            }}
          >
            Edit Profile
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textMuted,
              fontWeight: 300,
            }}
          >
            Update how other players see you across Binnacle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <label
              htmlFor="profile-name"
              style={{
                display: 'block',
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.textDim,
              }}
            >
              Display Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={formValues.name}
              onChange={handleChange('name')}
              placeholder="Your name..."
              required
              maxLength={80}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: C.bgAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                color: C.text,
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 300,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = C.gold;
                e.currentTarget.style.boxShadow = `0 0 0 1px ${C.gold}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '0.04em',
                color: C.textDim,
              }}
            >
              This is how other players will see you across Binnacle.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profile-bio"
              style={{
                display: 'block',
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.textDim,
              }}
            >
              Bio
            </label>
            <textarea
              id="profile-bio"
              value={formValues.bio ?? ''}
              onChange={handleChange('bio')}
              placeholder="Share a short description about your gaming tastes..."
              maxLength={500}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: C.bgAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                color: C.text,
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 300,
                outline: 'none',
                resize: 'vertical',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = C.gold;
                e.currentTarget.style.boxShadow = `0 0 0 1px ${C.gold}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '0.04em',
                color: C.textDim,
                textAlign: 'right',
              }}
            >
              {formValues.bio?.length ?? 0}/500
            </p>
          </div>

          {errorMessage && (
            <div
              className="px-3 py-2"
              style={{
                border: `1px solid ${C.red}33`,
                borderRadius: 2,
                background: `${C.red}08`,
              }}
            >
              <p
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  color: C.red,
                }}
              >
                {errorMessage}
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                background: 'transparent',
                color: C.textMuted,
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2"
              style={{
                border: 'none',
                borderRadius: 2,
                background: C.gold,
                color: C.bg,
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 500,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: `0 0 16px ${C.bloom}`,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting && (
                <Loader2
                  className="animate-spin"
                  style={{ width: 14, height: 14 }}
                />
              )}
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
