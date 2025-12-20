'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
}

/**
 * Updates user profile data in Clerk's public metadata.
 * This will automatically sync to Convex via webhooks.
 */
export async function updateClerkProfile(data: UpdateProfileData) {
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const client = await clerkClient();
    
    // Get current metadata
    const user = await client.users.getUser(userId);
    const currentMetadata = user.publicMetadata as Record<string, any>;

    // Prepare updates
    const updates: Record<string, any> = { ...currentMetadata };
    
    if (data.displayName !== undefined) {
      const trimmed = data.displayName.trim();
      if (trimmed.length === 0) {
        return { success: false, error: 'Display name cannot be empty' };
      }
      if (trimmed.length > 80) {
        return { success: false, error: 'Display name cannot exceed 80 characters' };
      }
      updates.displayName = trimmed;
    }

    if (data.bio !== undefined) {
      const trimmed = data.bio.trim();
      if (trimmed.length > 500) {
        return { success: false, error: 'Bio cannot exceed 500 characters' };
      }
      updates.bio = trimmed.length > 0 ? trimmed : undefined;
    }

    // Update Clerk user metadata
    await client.users.updateUser(userId, {
      publicMetadata: updates,
    });

    console.log('✅ Clerk profile updated:', { userId, updates });
    return { success: true };
  } catch (error) {
    console.error('Failed to update Clerk profile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update profile' 
    };
  }
}
