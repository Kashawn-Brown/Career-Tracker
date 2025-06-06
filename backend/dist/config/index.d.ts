declare const config: {
    server: {
        port: number;
        host: string;
    };
    cors: {
        origin: string | boolean;
        credentials: boolean;
    };
    database: {
        url: string;
    };
    uploads: {
        maxSize: number;
        allowedTypes: string[];
    };
};
export default config;
//# sourceMappingURL=index.d.ts.map