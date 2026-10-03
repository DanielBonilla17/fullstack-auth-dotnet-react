export interface AuthCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    username: string;
    expiration: string;
}

export interface UserProfile {
    message: string;
    email: string;
    timestamp: string;
}

export interface ApiErrorResponse {
    message?: string;
    errors?: Record<string, string[]>;
}