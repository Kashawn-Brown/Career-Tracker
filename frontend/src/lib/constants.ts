/** Must stay in sync with AI_FREE_QUOTA in backend/modules/ai/ai-access.ts */
export const AI_FREE_QUOTA = 5;

/** The number of days until a user with a pending request can request again. */
export const PENDING_REQUEST_COOLDOWN_DAYS = 3;

/** The number of days until a user with a denied request can request again. */
export const DENIED_REQUEST_COOLDOWN_DAYS = 7;
