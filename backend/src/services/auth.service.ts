/**
 * Authentication Service
 * 
 * Core authentication services for password hashing, JWT token management,
 * and email verification. Provides the foundational security operations
 * for the authentication system.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import crypto from 'crypto';
import { ErrorResponseBuilder, CommonErrors } from '../utils/errorResponse.js';
import {
  EmailVerificationResult,
  PasswordValidationResult,
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
import { UserRole } from '../models/user.models.js';
import { jwtService } from './jwt.service.js';
import { userRepository } from '../repositories/index.js';
import { queueService } from './queue.service.js';
import { generatePasswordChangeEmailContent } from '../utils/emailTemplates.js';

// Password hashing configuration
const BCRYPT_ROUNDS = 12; // Strong hashing (10+ rounds as required)

export class AuthService {

  // CORE AUTHENTICATION

  /**
   * Register a new user with email and password
   * Handles validation, user creation, email verification setup, and JWT token generation
   */
  async registerUser(email: string, password: string, name: string): Promise<RegisterUserResult> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        const error = ErrorResponseBuilder.create()
          .status(400)
          .error('Validation Error')
          .message('Invalid email format provided')
          .code('INVALID_EMAIL_FORMAT')
          .context({
            operation: 'user_registration',
            resource: 'user'
          })
          .build();
        
        return {
          success: false,
          statusCode: 400,
          error: error.error,
          details: [error.message!]
        };
      }

      // Validate password strength
      const passwordValidation = this.isValidPassword(password);
      if (!passwordValidation.valid) {
        const error = ErrorResponseBuilder.create()
          .status(400)
          .error('Password Validation Failed')
          .message('Password does not meet security requirements')
          .code('WEAK_PASSWORD')
          .context({
            operation: 'user_registration',
            resource: 'user'
          })
          .details(passwordValidation.errors)
          .action('Please choose a stronger password that meets all requirements')
          .build();

        return {
          success: false,
          statusCode: 400,
          error: error.error,
          details: passwordValidation.errors
        };
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        // If user exists but hasn't verified email, offer to resend verification
        if (!existingUser.emailVerified) {
          const error = ErrorResponseBuilder.create()
            .status(409)
            .error('Account Exists But Unverified')
            .message('You have already registered with this email but haven\'t verified it yet')
            .code('ACCOUNT_UNVERIFIED')
            .context({
              operation: 'user_registration',
              resource: 'user',
              userId: existingUser.id
            })
            .action('resend_verification')
            .build();

          return {
            success: false,
            statusCode: 409,
            error: error.error,
            action: 'resend_verification',
            message: 'Would you like to resend the verification email?'
          };
        }
        
        const error = ErrorResponseBuilder.create()
          .status(409)
          .error('Account Already Exists')
          .message('An account with this email address already exists and is verified')
          .code('ACCOUNT_EXISTS')
          .context({
            operation: 'user_registration',
            resource: 'user'
          })
          .action('Try logging in instead, or use the forgot password feature if needed')
          .build();

        return {
          success: false,
          statusCode: 409,
          error: error.error
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await userRepository.create({
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
        provider: 'LOCAL',
        providerId: null
      });

      // Generate and store email verification token
      const verificationToken = this.generateToken();
      await this.storeEmailVerificationToken(user.id, verificationToken);

      // Send verification email via queue (instant response!)
      try {
        if (queueService.isReady()) {
          await queueService.addEmailVerificationJob({
            to: email,
            userName: name,
            verificationToken,
            verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
          });
          console.log(`Email verification job queued for: ${email}`);
        } else {
          console.warn(`Queue service not available. Email verification token for ${email}: ${verificationToken}`);
        }
      } catch (emailError) {
        console.error('Failed to queue verification email:', emailError);
        // Don't fail registration if email queueing fails
      }

      // Generate JWT tokens with user role
      const tokens = jwtService.generateTokenPair(user.id, user.email, user.role as UserRole);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      return {
        success: true,
        statusCode: 201,
        message: 'User registered successfully. Please check your email for verification.',
        user: userResponse,
        tokens
      };

    } catch (error) {
      console.error('Registration error:', error);
      
      const errorResponse = ErrorResponseBuilder.create()
        .status(500)
        .error('Internal Server Error')
        .message('An unexpected error occurred during registration')
        .code('REGISTRATION_ERROR')
        .context({
          operation: 'user_registration',
          resource: 'user'
        })
        .details({
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          timestamp: new Date().toISOString()
        })
        .build();

      return {
        success: false,
        statusCode: 500,
        error: errorResponse.error
      };
    }
  }


  /**
   * Login user with email and password
   * Handles validation, credential verification, and JWT token generation
   */
  async loginUser(email: string, password: string): Promise<LoginUserResult> {
    try {

      // Find user
      const user = await userRepository.findByEmail(email);
      if (!user) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid credentials'
        };
      }

      // Check if user has a password (OAuth users don't)
      if (!user.password) {
        return {
          success: false,
          statusCode: 401,
          error: 'This account uses OAuth login. Please use Google or LinkedIn to sign in.'
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid credentials'
        };
      }

      // Generate JWT tokens with user role
      const tokens = jwtService.generateTokenPair(user.id, user.email, user.role as UserRole);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      return {
        success: true,
        statusCode: 200,
        message: 'Login successful',
        user: userResponse,
        tokens
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during login'
      };
    }
  }

  
  // EMAIL VERIFICATION

  /**
   * Process email verification with token
   * Handles validation, user verification, welcome email queueing, and response formatting
   */
  async processEmailVerification(token: string): Promise<ProcessEmailVerificationResult> {
    try {

      // Verify the token using the existing service method
      const verificationResult = await this.verifyEmailToken(token);

      if (!verificationResult.success) {
        const statusCode = verificationResult.action === 'resend_verification' ? 400 : 400;
        const response: ProcessEmailVerificationResult = {
          success: false,
          statusCode,
          error: verificationResult.message
        };
        
        if (verificationResult.action) {
          response.action = verificationResult.action;
          response.message = verificationResult.action === 'resend_verification' ? 'Please request a new verification email' : undefined;
        }
        
        return response;
      }

      // Email verified successfully! Send welcome email
      try {
        // We need to get the user info to send the welcome email
        const user = await userRepository.findByEmailToken(token);
        if (user && queueService.isReady()) {
          await queueService.addWelcomeEmailJob({
            to: user.email,
            userName: user.name
          });
          console.log(`Welcome email job queued for: ${user.email}`);
        }
      } catch (emailError) {
        console.error('Failed to queue welcome email:', emailError);
        // Don't fail verification if welcome email queueing fails
      }

      return {
        success: true,
        statusCode: 200,
        message: verificationResult.message
      };

    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during email verification'
      };
    }
  }


  /**
   * Resend email verification with comprehensive business logic
   * Validates email, looks up user, generates token, and queues email
   */
  async resendEmailVerification(email: string): Promise<ResendEmailVerificationResult> {
    const prisma = new PrismaClient();
    
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return {
          success: false,
          statusCode: 400,
          error: 'User not found'
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          statusCode: 400,
          error: 'Email is already verified'
        };
      }

      // Delete any existing verification tokens for this user
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id }
      });

      // Generate and store email verification token
      const newToken = this.generateToken();
      await this.storeEmailVerificationToken(user.id, newToken);

      // Queue email if service is ready
      if (queueService.isReady()) {
        try {
          await queueService.addEmailVerificationJob({
            to: email,
            userName: user.name,
            verificationToken: newToken,
            verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${newToken}`
          });
          console.log(`Email verification job re-queued for: ${email}`);
        } catch (emailError) {
          console.error('Failed to queue verification email:', emailError);
          // Don't fail the operation if email queueing fails
        }
      } else {
        console.warn(`Queue service not available. New email verification token for ${email}: ${newToken}`);
      }

      return {
        success: true,
        statusCode: 200,
        message: 'New verification email sent',
        token: newToken
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during resend verification'
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  // PASSWORD RESET

  /**
   * Initiate password reset process from forgot password form
   * Handles validation, user lookup, rate limiting, token generation, and email queueing
   */
  async initiatePasswordReset(email: string): Promise<InitiatePasswordResetResult> {
    try {

      // Validate email format
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Request password reset using the existing service method
      const result = await this.requestPasswordReset(email);

      // If a token was generated (user exists), send the email
      if (result.token) {
        try {
          const user = await userRepository.findByEmail(email);
          if (user && queueService.isReady()) {
            await queueService.addPasswordResetJob({
              to: email,
              userName: user.name,
              resetToken: result.token,
              resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${result.token}`
            });
            console.log(`Password reset email job queued for: ${email}`);
          } else {
            console.warn(`Queue service not available. Password reset token for ${email}: ${result.token}`);
          }
        } catch (emailError) {
          console.error('Failed to queue password reset email:', emailError);
          // Don't fail the operation if email queueing fails
        }
      }

      // Always return success message for security (don't reveal if email exists)
      return {
        success: true,
        statusCode: 200,
        message: result.message
      };

    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during password reset request'
      };
    }
  }

  
/**
   * Request password reset for a user email
   * Implements rate limiting (3 requests per email per hour)
   */
  async requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
    const prisma = new PrismaClient();
    
    try {
      // Find user by email (don't reveal if email exists for security)
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Always return success to not reveal if email exists
      if (!user) {
        return {
          success: true,
          message: 'If this email is registered, you will receive a password reset link.'
        };
        // security best practice to prevent email enumeration attacks
        // attackers could use it to discover which email addresses are registered in your system by trying different emails and observing the responses
        // By always returning the same success message regardless of whether the email exists, you prevent attackers from harvesting valid email addresses from your user database. 
      }

      // Check rate limiting - count recent reset requests for this email
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentRequests = await prisma.passwordResetToken.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      if (recentRequests >= 3) {
        return {
          success: true, // Still return success for security
          message: 'If this email is registered, you will receive a password reset link.'
        };
      }

      // Delete any existing password reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });

      // Generate new token for password reset
      const resetToken = this.generateToken();
      await this.storePasswordResetToken(user.id, resetToken);

      return {
        success: true,
        message: 'If this email is registered, you will receive a password reset link.',
        token: resetToken // Only used internally for email sending
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  /**
   * Reset password with enhanced security notifications
   */
  async resetPassword(
    token: string, 
    newPassword: string, 
    securityMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
    }
  ): Promise<ResetPasswordResult> {
    const prisma = new PrismaClient();
    
    try {
      // First verify the token
      const tokenVerification = await this.verifyPasswordResetToken(token);

      // If the token is not valid or the user ID is not found, return an error
      if (!tokenVerification.valid || !tokenVerification.userId) {
        return {
          success: false,
          message: tokenVerification.message
        };
      }

      // Validate password strength
      const passwordValidation = this.isValidPassword(newPassword);

      // If the password does not meet the requirements, return an error
      if (!passwordValidation.valid) {
        this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', false, 'Weak password provided', securityMetadata);
        return {
          success: false,
          message: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Check if password has been used recently (prevent reuse)
      const isPasswordReused = await this.isPasswordRecentlyUsed(tokenVerification.userId, newPassword);

      // If the password has been used recently, return an error
      if (isPasswordReused) {
        this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', false, 'Password reuse attempted', securityMetadata);
        return {
          success: false,
          message: 'You cannot reuse a password from the last 6 months. Please choose a different password.'
        };
      }

      // Get user details for notification
      const user = await prisma.user.findUnique({
        where: { id: tokenVerification.userId },
        select: {
          id: true,
          email: true,
          name: true,
          secondaryEmail: true,
          secondaryEmailVerified: true
        }
      });

      // If the user is not found, return an error
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Hash the new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password, store in history, and delete used token in a transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { id: tokenVerification.userId },
          data: { password: hashedPassword }
        }),
        prisma.passwordResetToken.deleteMany({
          where: { userId: tokenVerification.userId }
        })
      ]);

      // Store the new password in history (after successful update)
      await this.storePasswordInHistory(tokenVerification.userId, hashedPassword);

      // Send enhanced security notifications
      await this.sendPasswordChangeNotifications(user, securityMetadata);

      this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', true, 'Password reset completed successfully', securityMetadata);
      
      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      this.logPasswordResetAttempt(null, 'password_reset', false, `System error: ${error instanceof Error ? error.message : 'Unknown error'}`, securityMetadata);
      return {
        success: false,
        message: 'An error occurred while resetting your password'
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  /**
   * Log password reset attempts for security auditing
   */
  private logPasswordResetAttempt(
    userId: number | null, 
    action: 'token_verification' | 'password_reset', 
    success: boolean, 
    details: string,
    securityMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
    }
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      success,
      details,
      ip: securityMetadata?.ipAddress || 'N/A',
      userAgent: securityMetadata?.userAgent || 'N/A'
    };

    // For now, log to console. In production, this should go to a security audit log
    console.log(`[SECURITY_AUDIT] Password Reset: ${JSON.stringify(logEntry)}`);
  }


  // SECURITY QUESTIONS - account recovery
  
  /**
   * Get available security question types with display text
   */
  async getAvailableSecurityQuestions(): Promise<GetAvailableSecurityQuestionsResult> {
    // Define the mapping of enum values to display text
    const questionMap: Record<string, string> = {
      'FIRST_PET_NAME': 'What was the name of your first pet?',
      'MOTHER_MAIDEN_NAME': 'What is your mother\'s maiden name?',
      'FIRST_SCHOOL': 'What was the name of your first school?',
      'CHILDHOOD_FRIEND': 'What was the name of your childhood best friend?',
      'BIRTH_CITY': 'In what city were you born?',
      'FIRST_CAR': 'What was the make of your first car?',
      'FAVORITE_TEACHER': 'What was the name of your favorite teacher?',
      'FIRST_JOB': 'What was your first job?',
      'CHILDHOOD_STREET': 'What street did you grow up on?',
      'FATHER_MIDDLE_NAME': 'What is your father\'s middle name?'
    };

    // Convert to array format
    const questions = Object.entries(questionMap).map(([type, text]) => ({
      type,
      text
    }));

    return { questions };
  }  


  /**
   * Set up security questions for a user with validation
   */
  async validateSecurityQuestions(
    questions: Array<{ question: string; answer: string }>
  ): Promise<SetupSecurityQuestionsResult> {
    try {
      // Validate questions array
      if (!questions || !Array.isArray(questions)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Questions array is required'
        };
      }

      if (questions.length < 3 || questions.length > 5) {
        return {
          success: false,
          statusCode: 400,
          error: 'Must provide between 3 and 5 security questions'
        };
      }

      // Check for duplicate questions
      const questionTypes = questions.map(q => q.question);
      const uniqueQuestions = new Set(questionTypes);
      if (uniqueQuestions.size !== questionTypes.length) {
        return {
          success: false,
          statusCode: 400,
          error: 'Duplicate questions are not allowed'
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: `Successfully validated ${questions.length} security questions`,
        questionsSet: questions.length
      };

    } catch (error) {
      console.error('Setup security questions with validation error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during security questions setup'
      };
    }
  }


  /**
   * Set up security questions for a user
   */
  async setupSecurityQuestions(
    userId: number, 
    questions: Array<{ question: string; answer: string }>
  ): Promise<SetupSecurityQuestionsResult> {
    const prisma = new PrismaClient();
    
    try {
      // Clear existing security questions for the user
      await prisma.securityQuestion.deleteMany({
        where: { userId }
      });

      // Hash answers and store questions
      const securityQuestions = await Promise.all(
        questions.map(async (q) => ({
          userId,
          question: q.question as any, // Type assertion for enum
          answerHash: await this.hashSecurityAnswer(q.answer.trim()) // Trim but preserve case
        }))
      );

      // Store all security questions in a transaction
      await prisma.securityQuestion.createMany({
        data: securityQuestions
      });

      // Return the success message
      return {
        success: true,
        statusCode: 200,
        message: `Successfully set up ${questions.length} security questions for user: ${userId}`
      };
      
    } catch (error) {
      console.error('Setup security questions error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to set up security questions'
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  /**
   * Get user's security questions (without answers)
   */
  async getUserSecurityQuestions(userId: number): Promise<GetUserSecurityQuestionsResult> {
    const prisma = new PrismaClient();
    
    try {
      const questions = await prisma.securityQuestion.findMany({
        where: { userId },
        select: {
          id: true,
          question: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      return {
        success: true,
        statusCode: 200,
        message: 'Security questions retrieved successfully',
        questions
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  /**
   * Get recovery questions for an email (public endpoint)
   * Returns 2 random questions for verification
   */
  async getRecoveryQuestions(email: string): Promise<GetUserRecoveryQuestionsResult> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      return {
        success: false,
        statusCode: 400,
        error: 'Invalid email format'
      };
    }

    const prisma = new PrismaClient();
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          securityQuestions: {
            select: {
              id: true,
              question: true
            }
          }
        }
      });

      if (!user) {
        // Don't reveal if email exists - return generic message
        return {
          success: true,
          message: 'If an account exists with this email, security questions will be displayed.',
          questions: []
        };
      }

      if (user.securityQuestions.length === 0) {
        return {
          success: false,
          statusCode: 400,
          message: 'No security questions are set up for this account. Please use email recovery instead.'
        };
      }

      // Randomly select 2 questions from the user's security questions
      const shuffled = user.securityQuestions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, Math.min(2, user.securityQuestions.length));

      return {
        success: true,
        statusCode: 200,
        message: 'Please answer the following security questions',
        questions: selectedQuestions
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  /**
   * Verify security questions for account recovery
   */
  async verifySecurityQuestions(
    email: string, 
    answers: Array<{ questionId: number; answer: string }>,
    clientInfo: { ip: string; userAgent: string }
  ): Promise<VerifySecurityQuestionsResult> {
    try {

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      const prisma = new PrismaClient();
      
      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            securityQuestions: true
          }
        });

        if (!user) {
          // Log the attempt with client details
          console.log(`[SECURITY_AUDIT] Security Questions Verification: Email=${email}, Success=false, IP=${clientInfo.ip}, UserAgent=${clientInfo.userAgent}`);
          
          return {
            success: false,
            statusCode: 400,
            error: 'Invalid email or security answers'
          };
        }

        if (user.securityQuestions.length === 0) {
          // Log the attempt with client details
          console.log(`[SECURITY_AUDIT] Security Questions Verification: Email=${email}, Success=false, IP=${clientInfo.ip}, UserAgent=${clientInfo.userAgent}`);
          
          return {
            success: false,
            statusCode: 400,
            error: 'No security questions are set up for this account'
          };
        }

        // Verify all provided answers
        let correctAnswers = 0;
        for (const answer of answers) {
          const question = user.securityQuestions.find(q => q.id === answer.questionId);
          if (question) {
            const isCorrect = await this.compareSecurityAnswer(answer.answer.trim(), question.answerHash);
            if (isCorrect) {
              correctAnswers++;
            }
          }
        }

        // Require all answers to be correct
        if (correctAnswers === answers.length && answers.length >= 2) {
          // Generate new token for password reset
          const resetToken = this.generateToken();
          const expiresAt = this.getPasswordResetExpiry();

          // Store the reset token
          await prisma.passwordResetToken.create({
            data: {
              userId: user.id,
              token: resetToken,
              expiresAt
            }
          });

          // Log the successful attempt with client details
          console.log(`[SECURITY_AUDIT] Security Questions Verification: Email=${email}, Success=true, IP=${clientInfo.ip}, UserAgent=${clientInfo.userAgent}`);

          return {
            success: true,
            statusCode: 200,
            message: 'Security questions verified successfully',
            verified: true,
            resetToken
          };
        } else {
          // Log the failed attempt with client details
          console.log(`[SECURITY_AUDIT] Security Questions Verification: Email=${email}, Success=false, IP=${clientInfo.ip}, UserAgent=${clientInfo.userAgent}`);
          
          return {
            success: false,
            statusCode: 400,
            error: 'Incorrect answers provided'
          };
        }
      } finally {
        await prisma.$disconnect();
      }
    } catch (error) {
      console.error('Verify security questions error:', error);
      // Log the error attempt with client details
      console.log(`[SECURITY_AUDIT] Security Questions Verification: Email=${email}, Success=false, IP=${clientInfo.ip}, UserAgent=${clientInfo.userAgent}`);
      
      return {
        success: false,
        statusCode: 500,
        error: 'An error occurred during verification'
      };
    }
  }



  /** Helper function for verifySecurityQuestions method
   * 
   * Compare security question answer with hashed answer
   */
  async compareSecurityAnswer(answer: string, hash: string): Promise<boolean> {
    // Normalize answer: trim whitespace and convert to lowercase for consistency
    const normalizedAnswer = answer.trim().toLowerCase();
    
    // Pad short answers to meet bcrypt minimum length requirement
    const paddedAnswer = normalizedAnswer.padEnd(8, '0');
    
    return bcrypt.compare(paddedAnswer, hash);
  }


  // SECONDARY EMAIL

  /**
   * Set up secondary email for a user
   */
  async setupSecondaryEmail(userId: number, secondaryEmail: string): Promise<SetupSecondaryEmailResult> {
    const prisma = new PrismaClient();
    
    try {
      // Validate email format
      if (!this.isValidEmail(secondaryEmail)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Check if email is already in use as secondary email
      const existingUser = await prisma.user.findFirst({
        where: {
          secondaryEmail: secondaryEmail
        }
      });

      if (existingUser) {
        return {
          success: false,
          statusCode: 400,
          error: 'This email is already in use as a secondary email'
        };
      }
      // End of Selection

      // Generate new token for secondary email verification
      const verificationToken = this.generateToken();
      const expiresAt = this.getEmailVerificationExpiry();

      // Update user's secondary email and create verification token in a transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { 
            secondaryEmail,
            secondaryEmailVerified: false
          }
        }),
        prisma.secondaryEmailVerificationToken.create({
          data: {
            userId,
            token: verificationToken,
            email: secondaryEmail,
            expiresAt
          }
        })
      ]);

      return {
        success: true,
        statusCode: 200,
        message: 'Secondary email set up successfully. Please check your email for verification.',
        verificationToken
      };
    } catch (error) {
      console.error('Setup secondary email error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to set up secondary email'
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  /**
   * Verify secondary email token
   */
  async verifySecondaryEmail(token: string): Promise<VerifySecondaryEmailResult> {
    const prisma = new PrismaClient();
    
    try {
      // Find and validate the token
      const verificationToken = await prisma.secondaryEmailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!verificationToken) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid or expired verification token'
        };
      }

      // Check if token has expired
      if (new Date(verificationToken.expiresAt).getTime() < Date.now()) {
        // Clean up expired token
        await prisma.secondaryEmailVerificationToken.delete({
          where: { id: verificationToken.id }
        });
        
        return {
          success: false,
          statusCode: 400,
          error: 'Verification token has expired'
        };
      }

      // Verify the secondary email and remove the verification token
      await prisma.$transaction([
        prisma.user.update({
          where: { id: verificationToken.userId },
          data: { secondaryEmailVerified: true }
        }),
        prisma.secondaryEmailVerificationToken.delete({
          where: { id: verificationToken.id }
        })
      ]);

      // If the secondary email verification succeeds, return the message
      return {
        success: true,
        statusCode: 200,
        message: 'Secondary email verified successfully'
      };
    } catch (error) {
      console.error('Verify secondary email error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to verify secondary email'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  
  /**
   * Request password reset via secondary email
   */
  async requestPasswordResetSecondary(email: string): Promise<RequestPasswordResetSecondaryResult> {
    const prisma = new PrismaClient();
    
    try {
      // Find user by secondary email
      const user = await prisma.user.findFirst({
        where: { 
          secondaryEmail: email,
          secondaryEmailVerified: true
        }
      });

      if (!user) {
        // Don't reveal if secondary email exists - return generic message
        return {
          success: true,
          statusCode: 200,
          message: 'If this secondary email is associated with a verified account, you will receive password reset instructions.'
        };
      }

      // Generate new token for password reset
      const resetToken = this.generateToken();
      const expiresAt = this.getPasswordResetExpiry();

      // Store the reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt
        }
      });

      // If the password reset request succeeds, return the message and the token
      return {
        success: true,
        statusCode: 200,
        message: 'If this secondary email is associated with a verified account, you will receive password reset instructions.',
        token: resetToken
      };
    } catch (error) {
      console.error('Secondary email password reset error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'An error occurred while processing your request'
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  /* HELPER FUNCTIONS */

  // helper: Hash a password using bcrypt with 12 rounds for strong security
  async hashPassword(password: string): Promise<string> {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
  

  // helper: Compare a plain text password with a hashed password
  async comparePassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    return await bcrypt.compare(password, hash);
  }
  
  
  /** helper: Generate a secure random token
   * 
   * For:
   * - email verification
   * - password reset
   * Returns a URL-safe random string
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }


  // helper: Calculate expiration date for email verification tokens (24 hours)
  getEmailVerificationExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // 24 hours from now
    return expiry;
  }


  // helper: Calculate expiration date for refresh tokens (7 days)
  getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days from now
    return expiry;
  }


  // helper: Calculate expiration date for password reset tokens (1 hour)
  getPasswordResetExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // 1 hour from now
    return expiry;
  }


  // helper: Validate email format using basic regex
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }


  // helper: Validate password strength
  isValidPassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
  

  // helper: Store email verification token in database
  async storeEmailVerificationToken(userId: number, token: string): Promise<void> {
    const prisma = new PrismaClient();
    
    try {
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          token,
          expiresAt: this.getEmailVerificationExpiry()
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }


  // helper: Store password reset token in database
  async storePasswordResetToken(userId: number, token: string): Promise<void> {
    const prisma = new PrismaClient();
    
    try {
      await prisma.passwordResetToken.create({
        data: {
          userId,
          token,
          expiresAt: this.getPasswordResetExpiry()
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }


  // helper: Verify email verification token and mark user as verified
  async verifyEmailToken(token: string): Promise<EmailVerificationResult> {
    const prisma = new PrismaClient();
    
    try {
      const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Invalid verification token'
        };
      }

      if (verificationToken.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Verification token has expired',
          action: 'resend_verification'
        };
      }

      // Mark user as verified and delete the token
      await prisma.$transaction([
        prisma.user.update({
          where: { id: verificationToken.userId },
          data: { emailVerified: true }
        }),
        prisma.emailVerificationToken.delete({
          where: { id: verificationToken.id }
        })
      ]);

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  // helper: Verify password reset token validity and expiration
  async verifyPasswordResetToken(token: string): Promise<VerifyPasswordResetTokenResult> {
    const prisma = new PrismaClient();
    
    try {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken) {
        this.logPasswordResetAttempt(null, 'token_verification', false, 'Invalid token');
        return {
          valid: false,
          message: 'Invalid or expired password reset token'
        };
      }

      if (resetToken.expiresAt < new Date()) {
        this.logPasswordResetAttempt(resetToken.userId, 'token_verification', false, 'Token expired');
        return {
          valid: false,
          message: 'Password reset token has expired'
        };
      }

      this.logPasswordResetAttempt(resetToken.userId, 'token_verification', true, 'Token verified successfully');
      return {
        valid: true,
        message: 'Password reset token is valid',
        userId: resetToken.userId
      };
    } finally {
      await prisma.$disconnect();
    }
  }


  // helper: Check if password has been used recently (within 6 months)
  async isPasswordRecentlyUsed(userId: number, password: string): Promise<boolean> {
    const prisma = new PrismaClient();
    
    try {
      // Get password history for the user within 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const passwordHistory = await prisma.passwordHistory.findMany({
        where: {
          userId,
          createdAt: {
            gte: sixMonthsAgo
          }
        }
      });

      // Check if the new password matches any recent password
      for (const historyEntry of passwordHistory) {
        const isMatch = await this.comparePassword(password, historyEntry.passwordHash);
        if (isMatch) {
          return true;
        }
      }

      return false;
    } finally {
      await prisma.$disconnect();
    }
  }


  // helper: Store password in history for reuse prevention
  async storePasswordInHistory(userId: number, passwordHash: string): Promise<void> {
    const prisma = new PrismaClient();
    
    try {
      // Store the password hash in history
      await prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash
        }
      });

      // Clean up old password history entries (older than 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      await prisma.passwordHistory.deleteMany({
        where: {
          userId,
          createdAt: {
            lt: sixMonthsAgo
          }
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  
  // helper: Send enhanced password change notifications to primary and secondary emails
  private async sendPasswordChangeNotifications(
    user: {
      id: number;
      email: string;
      name: string;
      secondaryEmail: string | null;
      secondaryEmailVerified: boolean;
    },
    securityMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
    }
  ): Promise<void> {
    const timestamp = securityMetadata?.timestamp || new Date();
    const ipAddress = securityMetadata?.ipAddress || 'Unknown';
    const userAgent = securityMetadata?.userAgent || 'Unknown';
    
    // Parse basic device info from user agent
    const deviceInfo = this.parseDeviceInfo(userAgent);
    
    // Create enhanced notification content
    const notificationData = {
      userName: user.name,
      timestamp: timestamp.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      ipAddress,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.os,
      location: 'Location lookup disabled', // Could add IP geolocation service
      supportEmail: process.env.SUPPORT_EMAIL || 'support@career-tracker.com'
    };

    // Email templates
    const subject = '🔒 Password Changed Successfully - Career Tracker';
    const emailContent = generatePasswordChangeEmailContent(notificationData);

    // Send to primary email
    console.log(`[EMAIL_NOTIFICATION] Sending password change notification to primary email: ${user.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${emailContent}`);

    // Send to secondary email if verified
    if (user.secondaryEmail && user.secondaryEmailVerified) {
      console.log(`\n[EMAIL_NOTIFICATION] Sending password change notification to secondary email: ${user.secondaryEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${emailContent}`);
    }

    // Log the notification for audit purposes
    console.log(`[SECURITY_AUDIT] Password change notifications sent for user ${user.id} to ${user.secondaryEmail && user.secondaryEmailVerified ? 2 : 1} email address(es)`);
  }


  // helper: Parse basic device information from User-Agent string
  private parseDeviceInfo(userAgent: string): { browser: string; os: string } {
    const ua = userAgent.toLowerCase();
    
    // Basic browser detection
    let browser = 'Unknown Browser';
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Google Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Mozilla Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('edg')) {
      browser = 'Microsoft Edge';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
    }

    // Basic OS detection
    let os = 'Unknown OS';
    if (ua.includes('windows nt 10')) {
      os = 'Windows 10/11';
    } else if (ua.includes('windows nt')) {
      os = 'Windows';
    } else if (ua.includes('mac os x')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    return { browser, os };
  }

  
  // helper: Hash security question answer (can be shorter than passwords)
  async hashSecurityAnswer(answer: string): Promise<string> {
    // Normalize answer: trim whitespace and convert to lowercase for consistency
    const normalizedAnswer = answer.trim().toLowerCase();
    
    // Pad short answers to meet bcrypt minimum length requirement
    const paddedAnswer = normalizedAnswer.padEnd(8, '0');
    
    return bcrypt.hash(paddedAnswer, BCRYPT_ROUNDS);
  }
}

// Export singleton instance
export const authService = new AuthService(); 