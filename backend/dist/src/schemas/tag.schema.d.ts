/**
 * Tag API Schemas
 *
 * Defines JSON schemas for tag REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */
export declare const listTagsSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            userId: {
                type: string;
                pattern: string;
            };
        };
    };
    querystring: {
        type: string;
        properties: {
            search: {
                type: string;
                minLength: number;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
                default: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            items: {
                properties: {
                    jobApplication: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                            };
                            company: {
                                type: string;
                            };
                            position: {
                                type: string;
                            };
                            status: {
                                type: string;
                            };
                        };
                    };
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
                type: string;
            };
        };
    };
};
export declare const addTagsToApplicationSchema: {
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
        required: string[];
        properties: {
            tags: {
                type: string;
                items: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                };
                minItems: number;
                maxItems: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
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
    };
};
export declare const removeTagFromApplicationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                pattern: string;
            };
            tagId: {
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
                deletedTagId: {
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
    };
};
//# sourceMappingURL=tag.schema.d.ts.map