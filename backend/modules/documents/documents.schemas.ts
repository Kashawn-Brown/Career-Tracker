import { Type, Static } from "@sinclair/typebox";

/**
 * Schemas for Fastify to validate incoming document requests.
 * 
 * MVP: register base resume metadata (URL + file info).
 * Later: URL/storageKey will be produced by GCS upload flow.
 */


/**
 * Defines the shape of the request body for upserting base resume.
 */
export const UpsertBaseResumeBody = Type.Object(
  {
    url: Type.String({ maxLength: 4096 }),      // Where the file is accessible from
    originalName: Type.String({ minLength: 1, maxLength: 255 }),  // filename
    mimeType: Type.String({ minLength: 1, maxLength: 100 }),  // file type
    size: Type.Optional(Type.Integer({ minimum: 0 })),  // File size in bytes
    storageKey: Type.Optional(Type.String({ maxLength: 1024 })), // future: gcs object key (e.g."base-resume/<userId>/resume.pdf")
  },
  { additionalProperties: false }
);


/**
 * Defines the shape of the request params for getting a document.
 */
export const DocumentIdParams = Type.Object(
  { id: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
);



export type UpsertBaseResumeBodyType = Static<typeof UpsertBaseResumeBody>;
export type DocumentIdParamsType = Static<typeof DocumentIdParams>;
