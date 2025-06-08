/**
 * Job Application API Schemas
 *
 * Defines JSON schemas for job application REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */
export declare const createJobApplicationSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            tags: {
                type: string;
                items: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                maxItems: number;
            };
            company: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            position: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            dateApplied: {
                type: string;
                format: string;
            };
            status: {
                type: string;
                enum: string[];
            };
            type: {
                type: string;
                enum: string[];
                nullable: boolean;
            };
            salary: {
                type: string;
                minimum: number;
                nullable: boolean;
            };
            jobLink: {
                type: string;
                format: string;
                nullable: boolean;
            };
            compatibilityScore: {
                type: string;
                minimum: number;
                maximum: number;
                nullable: boolean;
            };
            notes: {
                type: string;
                maxLength: number;
                nullable: boolean;
            };
            isStarred: {
                type: string;
            };
            followUpDate: {
                type: string;
                format: string;
                nullable: boolean;
            };
            deadline: {
                type: string;
                format: string;
                nullable: boolean;
            };
            userId: {
                type: string;
                minimum: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        201: {
            type: string;
            properties: {
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
                tags: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                            };
                            name: {
                                type: string;
                            };
                            createdAt: {
                                type: string;
                                format: string;
                            };
                        };
                    };
                };
                documents: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                jobConnections: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                company: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                position: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                dateApplied: {
                    type: string;
                    format: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                type: {
                    type: string;
                    enum: string[];
                    nullable: boolean;
                };
                salary: {
                    type: string;
                    minimum: number;
                    nullable: boolean;
                };
                jobLink: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                compatibilityScore: {
                    type: string;
                    minimum: number;
                    maximum: number;
                    nullable: boolean;
                };
                notes: {
                    type: string;
                    maxLength: number;
                    nullable: boolean;
                };
                isStarred: {
                    type: string;
                };
                followUpDate: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                deadline: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                id: {
                    type: string;
                };
                userId: {
                    type: string;
                };
            };
        };
    };
};
export declare const updateJobApplicationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                pattern: string;
            };
        };
    };
    body: {
        type: string;
        properties: {
            tags: {
                type: string;
                items: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                maxItems: number;
            };
            company: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            position: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            dateApplied: {
                type: string;
                format: string;
            };
            status: {
                type: string;
                enum: string[];
            };
            type: {
                type: string;
                enum: string[];
                nullable: boolean;
            };
            salary: {
                type: string;
                minimum: number;
                nullable: boolean;
            };
            jobLink: {
                type: string;
                format: string;
                nullable: boolean;
            };
            compatibilityScore: {
                type: string;
                minimum: number;
                maximum: number;
                nullable: boolean;
            };
            notes: {
                type: string;
                maxLength: number;
                nullable: boolean;
            };
            isStarred: {
                type: string;
            };
            followUpDate: {
                type: string;
                format: string;
                nullable: boolean;
            };
            deadline: {
                type: string;
                format: string;
                nullable: boolean;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
                tags: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                            };
                            name: {
                                type: string;
                            };
                            createdAt: {
                                type: string;
                                format: string;
                            };
                        };
                    };
                };
                documents: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                jobConnections: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                company: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                position: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                dateApplied: {
                    type: string;
                    format: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                type: {
                    type: string;
                    enum: string[];
                    nullable: boolean;
                };
                salary: {
                    type: string;
                    minimum: number;
                    nullable: boolean;
                };
                jobLink: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                compatibilityScore: {
                    type: string;
                    minimum: number;
                    maximum: number;
                    nullable: boolean;
                };
                notes: {
                    type: string;
                    maxLength: number;
                    nullable: boolean;
                };
                isStarred: {
                    type: string;
                };
                followUpDate: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                deadline: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                id: {
                    type: string;
                };
                userId: {
                    type: string;
                };
            };
        };
    };
};
export declare const getJobApplicationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                pattern: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
                tags: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                            };
                            name: {
                                type: string;
                            };
                            createdAt: {
                                type: string;
                                format: string;
                            };
                        };
                    };
                };
                documents: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                jobConnections: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                company: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                position: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                dateApplied: {
                    type: string;
                    format: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                type: {
                    type: string;
                    enum: string[];
                    nullable: boolean;
                };
                salary: {
                    type: string;
                    minimum: number;
                    nullable: boolean;
                };
                jobLink: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                compatibilityScore: {
                    type: string;
                    minimum: number;
                    maximum: number;
                    nullable: boolean;
                };
                notes: {
                    type: string;
                    maxLength: number;
                    nullable: boolean;
                };
                isStarred: {
                    type: string;
                };
                followUpDate: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                deadline: {
                    type: string;
                    format: string;
                    nullable: boolean;
                };
                id: {
                    type: string;
                };
                userId: {
                    type: string;
                };
            };
        };
    };
};
export declare const listJobApplicationsSchema: {
    querystring: {
        type: string;
        properties: {
            page: {
                type: string;
                minimum: number;
                default: number;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
                default: number;
            };
            userId: {
                type: string;
                minimum: number;
            };
            status: {
                type: string;
                enum: string[];
            };
            company: {
                type: string;
                minLength: number;
            };
            position: {
                type: string;
                minLength: number;
            };
            dateFrom: {
                type: string;
                format: string;
            };
            dateTo: {
                type: string;
                format: string;
            };
            isStarred: {
                type: string;
            };
            hasFollowUp: {
                type: string;
            };
            salaryMin: {
                type: string;
                minimum: number;
            };
            salaryMax: {
                type: string;
                minimum: number;
            };
            compatibilityScoreMin: {
                type: string;
                minimum: number;
                maximum: number;
            };
            sortBy: {
                type: string;
                enum: string[];
                default: string;
            };
            sortOrder: {
                type: string;
                enum: string[];
                default: string;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                data: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            createdAt: {
                                type: string;
                                format: string;
                            };
                            updatedAt: {
                                type: string;
                                format: string;
                            };
                            tags: {
                                type: string;
                                items: {
                                    type: string;
                                    properties: {
                                        id: {
                                            type: string;
                                        };
                                        name: {
                                            type: string;
                                        };
                                        createdAt: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                            documents: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                            jobConnections: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                            company: {
                                type: string;
                                minLength: number;
                                maxLength: number;
                            };
                            position: {
                                type: string;
                                minLength: number;
                                maxLength: number;
                            };
                            dateApplied: {
                                type: string;
                                format: string;
                            };
                            status: {
                                type: string;
                                enum: string[];
                            };
                            type: {
                                type: string;
                                enum: string[];
                                nullable: boolean;
                            };
                            salary: {
                                type: string;
                                minimum: number;
                                nullable: boolean;
                            };
                            jobLink: {
                                type: string;
                                format: string;
                                nullable: boolean;
                            };
                            compatibilityScore: {
                                type: string;
                                minimum: number;
                                maximum: number;
                                nullable: boolean;
                            };
                            notes: {
                                type: string;
                                maxLength: number;
                                nullable: boolean;
                            };
                            isStarred: {
                                type: string;
                            };
                            followUpDate: {
                                type: string;
                                format: string;
                                nullable: boolean;
                            };
                            deadline: {
                                type: string;
                                format: string;
                                nullable: boolean;
                            };
                            id: {
                                type: string;
                            };
                            userId: {
                                type: string;
                            };
                        };
                    };
                };
                pagination: {
                    type: string;
                    properties: {
                        page: {
                            type: string;
                        };
                        limit: {
                            type: string;
                        };
                        total: {
                            type: string;
                        };
                        totalPages: {
                            type: string;
                        };
                        hasNext: {
                            type: string;
                        };
                        hasPrev: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const deleteJobApplicationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                pattern: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                deletedId: {
                    type: string;
                };
            };
        };
    };
};
export declare const errorResponseSchema: {
    type: string;
    properties: {
        error: {
            type: string;
        };
        message: {
            type: string;
        };
        statusCode: {
            type: string;
        };
    };
};
//# sourceMappingURL=job-application.schema.d.ts.map