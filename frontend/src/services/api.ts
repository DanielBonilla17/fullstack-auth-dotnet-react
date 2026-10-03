import type { AuthCredentials, AuthResponse, UserProfile, ApiErrorResponse } from '../types/auth';

const API_BASE_URL = '/api';



async function handlerResponse<T>(response: Response): Promise<T> {

    if (!response.ok) {
        let errorMessage = 'Ocorreu um erro inesperado.';

        try {
            const errorData: ApiErrorResponse = await response.json();
            if (errorData.message) {
                errorMessage = errorData.message;
            }
            else if (errorData.errors) {
                const firstErrorKey = Object.keys(errorData.errors)[0];
                errorMessage = errorData.errors[firstErrorKey][0];
            }

        } catch {
            errorMessage = `Erro ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage);

    }
    return response.json() as Promise<T>;
}

export const apiService = {

    async login(credentials: AuthCredentials): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

        return handlerResponse<AuthResponse>(response);
    },

    async register(credentials: AuthCredentials): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/register`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

        return handlerResponse<AuthResponse>(response)


    },


    async getProfile(token: string): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            headers: {
                'Content-Type': "application/json",
                'Authorization': `Bearer ${token}`,
            },
        });
        return handlerResponse<UserProfile>(response);
    },
};
