import { Type, Static } from "@sinclair/typebox";

export const ProDecisionBody = Type.Object(
  {
    decisionNote: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

export type ProDecisionBodyType = Static<typeof ProDecisionBody>;
