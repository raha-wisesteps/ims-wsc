// Helper to send email notifications via local API route
// Usage: import { sendEmailNotification } from '@/lib/email-notification'

interface NewRequestPayload {
  type: "new_request";
  request_id: string;
  profile_id: string;
  leave_type: string;
  requester_name: string;
  start_date: string;
  end_date: string;
  reason: string;
}

interface ApprovedLeavePayload {
  type: "approved_leave";
  request_id: string;
  profile_id: string;
  leave_type: string;
  requester_name: string;
  start_date: string;
  end_date: string;
  reason: string;
}

interface RequestApprovedUserPayload {
  type: "request_approved_user";
  request_id: string;
  profile_id: string;
  leave_type: string;
  requester_name: string;
  start_date: string;
  end_date: string;
  reason: string;
}

type EmailNotificationPayload = NewRequestPayload | ApprovedLeavePayload | RequestApprovedUserPayload | RequestRejectedUserPayload;

interface RequestRejectedUserPayload {
  type: "request_rejected_user";
  request_id: string;
  profile_id: string;
  leave_type: string;
  requester_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  reject_reason?: string;
}

/**
 * Send email notification via Next.js API route → Resend.
 * Errors are logged but don't block the UI.
 */
export async function sendEmailNotification(
  payload: EmailNotificationPayload
): Promise<void> {
  try {
    const response = await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Email notification failed: ${response.status} - ${errorText}`);
    } else {
      console.log(`Email notification sent: type=${payload.type}`);
    }
  } catch (error) {
    console.error("Email notification error (non-blocking):", error);
  }
}
