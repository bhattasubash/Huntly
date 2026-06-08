'use server';

import { createServerSideClient } from '@/lib/supabase/server';

/**
 * Sets the viewed_at timestamp if it hasn't been set yet.
 */
export async function markAsViewed(id: string) {
  try {
    const supabase = await createServerSideClient();

    // Check if already viewed
    const { data: opp, error: fetchError } = await supabase
      .from('opportunities')
      .select('viewed_at')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!opp.viewed_at) {
      const { error } = await supabase
        .from('opportunities')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('markAsViewed action error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Updates an opportunity's status and logs matching lifecycle timestamp.
 */
export async function updateOpportunityStatus(
  id: string,
  status: 'new' | 'reviewing' | 'approved' | 'dismissed' | 'posted',
  selectedReply?: string,
  customReply?: string
) {
  try {
    const supabase = await createServerSideClient();

    const updates: any = { status };

    const now = new Date().toISOString();
    if (status === 'approved') {
      updates.approved_at = now;
    } else if (status === 'dismissed') {
      updates.dismissed_at = now;
    } else if (status === 'posted') {
      updates.posted_at = now;
    }

    if (selectedReply !== undefined) {
      updates.selected_reply = selectedReply;
    }
    if (customReply !== undefined) {
      updates.custom_reply = customReply;
    }

    const { error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('updateOpportunityStatus action error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Saves user lead quality feedback.
 */
export async function submitFeedback(
  id: string,
  feedback: 'good_lead' | 'bad_lead' | 'irrelevant' | 'converted'
) {
  try {
    const supabase = await createServerSideClient();

    const { error } = await supabase
      .from('opportunities')
      .update({ user_feedback: feedback })
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('submitFeedback action error:', err);
    return { success: false, error: err.message };
  }
}
