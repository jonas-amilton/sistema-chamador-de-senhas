export type User = {
    id: number;
    name: string;
    email: string;
    unit_id: string | null;
    role: 'admin' | 'attendant';
    is_active: boolean;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
