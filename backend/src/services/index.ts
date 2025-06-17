/**
 * Services Index
 * 
 * Central export point for all service modules.
 * Provides easy access to business logic services.
 */

export { tagService, TagService } from './tag.service.js';
export type { TagFilters, AddTagsRequest, RemoveTagRequest } from '../models/tag.models.js';

export { jobApplicationService, JobApplicationService } from './job-application.service.js';
export type { JobApplicationListFilters, CreateJobApplicationRequest, UpdateJobApplicationRequest } from '../models/job-application.models.js';

export { authService, AuthService } from './auth.service.js';
export type { 
  OAuthProfile,
  EmailVerificationResult,
  ResendVerificationResult,
  PasswordValidationResult,
  OAuthProviderStatus,
  OAuthStatusResponse,
  RegisterUserResult,
  LoginUserResult,
  InitiatePasswordResetResult,
  RequestPasswordResetResult,
  ResetPasswordResult,
  ProcessEmailVerificationResult,
  ResendEmailVerificationResult,
  SetupSecurityQuestionsResult,
  GetUserSecurityQuestionsResult,
  GetUserRecoveryQuestionsResult,
  GetAvailableSecurityQuestionsResult,
  VerifySecurityQuestionsResult,
  VerifySecondaryEmailResult,
  SetupSecondaryEmailResult,
  RequestPasswordResetSecondaryResult,
  VerifyPasswordResetTokenResult
} from '../models/auth.models.js';
export type { JWTPayload, TokenPair } from '../models/jwt.models.js';

export { contactService, ContactService } from './contact.service.js';
export type { 
  ContactListFilters, 
  CreateContactRequest, 
  UpdateContactRequest,
  ListContactsResult,
  GetContactResult,
  CreateContactResult,
  UpdateContactResult,
  DeleteContactResult,
  ContactStatsResult
} from '../models/contact.models.js';

export { JobConnectionService } from './job-connection.service.js';
export type { JobConnectionListFilters, CreateJobConnectionRequest, UpdateJobConnectionRequest, UpdateJobConnectionStatusRequest } from '../models/job-connection.models.js';

export { documentService, DocumentService } from './document.service.js';
export type { 
  DocumentListFilters, 
  CreateDocumentRequest, 
  UpdateDocumentRequest, 
  DocumentStats, 
  DocumentListResponse,
  UploadDocumentResult,
  ListDocumentsResult,
  GetDocumentResult,
  UpdateDocumentResult,
  DeleteDocumentResult,
  SearchDocumentsResult,
  DocumentStatsResult,
  UploadedFileInfo
} from '../models/document.models.js';

export { fileUploadService, FileUploadService } from './file-upload.service.js';
export type { FileStorageResult, FileRetrievalResult } from './file-upload.service.js'; 