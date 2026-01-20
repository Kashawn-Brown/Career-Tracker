import { Type, Static } from "@sinclair/typebox";

/**
 * Schemas for Fastify to validate incoming document requests.
 * 
 * Base Resume:
 * - Uploaded as multipart/form-data (single `file` field)
 * - Stored in GCS + persisted as Document(kind=BASE_RESUME)
 * - Therefore: no JSON body schema for upserting base resume.
 */


/**
 * Request params for getting/deleting a document.
 */
export const DocumentIdParams = Type.Object(
  { id: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
);

/**
 * Query params for downloading a document.
 */
export const DocumentDownloadQuery = Type.Object(
  {
    disposition: Type.Optional(
      Type.Union([Type.Literal("inline"), Type.Literal("attachment")])
    ),
  },
  { additionalProperties: false }
);



export type DocumentIdParamsType = Static<typeof DocumentIdParams>;
export type DocumentDownloadQueryType = Static<typeof DocumentDownloadQuery>;

