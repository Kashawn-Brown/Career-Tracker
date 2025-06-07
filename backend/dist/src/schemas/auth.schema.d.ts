/**
 * Authentication API Schemas
 *
 * Defines JSON schemas for authentication REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */
export declare const registerSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
            };
            password: {
                type: string;
                minLength: number;
            };
            name: {
                type: string;
                minLength: number;
                maxLength: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        201: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                user: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        email: {
                            type: string;
                            format: string;
                        };
                        name: {
                            type: string;
                        };
                        emailVerified: {
                            type: string;
                        };
                        provider: {
                            type: string;
                            enum: string[];
                        };
                        providerId: {
                            type: string[];
                        };
                        resumeLink: {
                            type: string[];
                        };
                        githubLink: {
                            type: string[];
                        };
                        linkedinLink: {
                            type: string[];
                        };
                        createdAt: {
                            type: string;
                            format: string;
                        };
                        updatedAt: {
                            type: string;
                            format: string;
                        };
                    };
                };
                tokens: {
                    type: string;
                    properties: {
                        accessToken: {
                            type: string;
                        };
                        refreshToken: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const loginSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
            };
            password: {
                type: string;
                minLength: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                user: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        email: {
                            type: string;
                            format: string;
                        };
                        name: {
                            type: string;
                        };
                        emailVerified: {
                            type: string;
                        };
                        provider: {
                            type: string;
                            enum: string[];
                        };
                        providerId: {
                            type: string[];
                        };
                        resumeLink: {
                            type: string[];
                        };
                        githubLink: {
                            type: string[];
                        };
                        linkedinLink: {
                            type: string[];
                        };
                        createdAt: {
                            type: string;
                            format: string;
                        };
                        updatedAt: {
                            type: string;
                            format: string;
                        };
                    };
                };
                tokens: {
                    type: string;
                    properties: {
                        accessToken: {
                            type: string;
                        };
                        refreshToken: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const verifyEmailSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            token: {
                type: string;
                minLength: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const refreshTokenSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            refreshToken: {
                type: string;
                minLength: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                tokens: {
                    type: string;
                    properties: {
                        accessToken: {
                            type: string;
                        };
                        refreshToken: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const resendVerificationSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const oauthStatusSchema: {
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                providers: {
                    type: string;
                    properties: {
                        google: {
                            type: string;
                            properties: {
                                enabled: {
                                    type: string;
                                };
                                configured: {
                                    type: string;
                                };
                            };
                        };
                        linkedin: {
                            type: string;
                            properties: {
                                enabled: {
                                    type: string;
                                };
                                configured: {
                                    type: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const authErrorResponseSchema: {
    type: string;
    properties: {
        error: {
            type: string;
        };
        message: {
            type: string[];
        };
        action: {
            type: string[];
        };
        details: {
            type: string;
            items: {
                type: string;
            };
        };
    };
};
//# sourceMappingURL=auth.schema.d.ts.map