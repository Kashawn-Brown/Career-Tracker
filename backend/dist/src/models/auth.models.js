/**
 * Authentication Models
 *
 * Defines TypeScript interfaces and types for authentication-related entities.
 * These models represent the structure of authentication data used throughout the application.
 */
/**
 * Authentication Provider enum
 * Used for OAuth and local authentication
 */
export var AuthProvider;
(function (AuthProvider) {
    AuthProvider["LOCAL"] = "LOCAL";
    AuthProvider["GOOGLE"] = "GOOGLE";
    AuthProvider["LINKEDIN"] = "LINKEDIN";
    AuthProvider["GITHUB"] = "GITHUB";
})(AuthProvider || (AuthProvider = {}));
//# sourceMappingURL=auth.models.js.map