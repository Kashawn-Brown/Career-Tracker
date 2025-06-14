/**
 * Email Templates Utility
 * 
 * Contains reusable email template functions for various notifications.
 * These templates generate rich HTML content for different email types.
 */

/**
 * Generate rich HTML email content for password change notification
 */
export function generatePasswordChangeEmailContent(data: {
  userName: string;
  timestamp: string;
  ipAddress: string;
  browser: string;
  operatingSystem: string;
  location: string;
  supportEmail: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed Successfully</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🔒 Password Changed Successfully</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Career Tracker account is secure</p>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${data.userName}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Your password has been successfully changed for your Career Tracker account. This email confirms the security change and provides details about when and where it occurred.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0; font-size: 18px;">Change Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 30%;">Date & Time:</td>
                    <td style="padding: 8px 0;">${data.timestamp}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">IP Address:</td>
                    <td style="padding: 8px 0; font-family: monospace;">${data.ipAddress}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Browser:</td>
                    <td style="padding: 8px 0;">${data.browser}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Operating System:</td>
                    <td style="padding: 8px 0;">${data.operatingSystem}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                    <td style="padding: 8px 0;">${data.location}</td>
                </tr>
            </table>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0; font-size: 16px;">🚨 Didn't change your password?</h4>
            <p style="color: #856404; margin-bottom: 0; font-size: 14px;">If you didn't make this change, your account may have been compromised. Please contact our support team immediately at <a href="mailto:${data.supportEmail}" style="color: #856404; text-decoration: underline;">${data.supportEmail}</a></p>
        </div>
        
        <div style="margin: 25px 0;">
            <h4 style="font-size: 16px; color: #495057;">Security Tips:</h4>
            <ul style="color: #6c757d; font-size: 14px; line-height: 1.5;">
                <li>Use a unique, strong password for your Career Tracker account</li>
                <li>Enable two-factor authentication if available</li>
                <li>Never share your password with anyone</li>
                <li>Log out from shared or public computers</li>
                <li>Monitor your account for suspicious activity</li>
            </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #6c757d; text-align: center; margin-bottom: 10px;">
            This is an automated security notification from Career Tracker.<br>
            If you have questions, please contact us at <a href="mailto:${data.supportEmail}" style="color: #007bff;">${data.supportEmail}</a>
        </p>
        
        <p style="font-size: 12px; color: #adb5bd; text-align: center; margin: 0;">
            © 2024 Career Tracker. All rights reserved.
        </p>
    </div>
</body>
</html>`;
} 