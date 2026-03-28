export type FileType = 'audio' | 'score' | 'lyrics' | 'midi' | 'other';
export type UserRole = 'user' | 'premium' | 'admin';

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    totalPages: number;
}