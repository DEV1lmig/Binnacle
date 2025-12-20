'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';

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
      <DialogContent className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update how other players see you across Binnacle.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={formValues.name}
              onChange={handleChange('name')}
              placeholder="Your name"
              required
              maxLength={80}
            />
            <p className="text-xs text-[var(--bkl-color-text-secondary)]">This is how other players will see you across Binnacle.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={formValues.bio ?? ''}
              onChange={handleChange('bio')}
              placeholder="Share a short description about your gaming tastes."
              maxLength={500}
              rows={4}
            />
            <p className="text-xs text-[var(--bkl-color-text-secondary)]">{formValues.bio?.length ?? 0}/500 characters</p>
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-500">{errorMessage}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90">
              {submitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
