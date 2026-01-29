import { Type, Static } from "@sinclair/typebox";

/**
 * Google callback query params.
 * - Google may include additional query params (scope, authuser, prompt, etc),
 * - so do NOT restrict additionalProperties.
 */
export const GoogleOAuthCallbackQuery = Type.Object({
  code: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  error: Type.Optional(Type.String()),
});

export type GoogleOAuthCallbackQueryType = Static<typeof GoogleOAuthCallbackQuery>;
