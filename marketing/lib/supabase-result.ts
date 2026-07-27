type SupabaseResult = {
    error: unknown;
};

export function requireSupabaseSuccess<T extends SupabaseResult>(result: T): T {
    if (result.error) {
        console.error('Supabase operation failed:', result.error);
        throw result.error;
    }
    return result;
}
