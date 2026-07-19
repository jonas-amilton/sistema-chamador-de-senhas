export class HttpError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly errors: Record<string, string[]> = {},
    ) {
        super(message);
    }
}

type ErrorResponse = {
    message?: string;
    errors?: Record<string, string[]>;
};

async function parseError(response: Response): Promise<HttpError> {
    let payload: ErrorResponse = {};

    try {
        payload = (await response.json()) as ErrorResponse;
    } catch {
        // A non-JSON infrastructure response still becomes a useful error.
    }

    return new HttpError(
        payload.message ?? 'Não foi possível concluir a operação.',
        response.status,
        payload.errors,
    );
}

export async function getJson<T>(
    url: string,
    signal?: AbortSignal,
): Promise<T> {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        signal,
    });

    if (!response.ok) {
        throw await parseError(response);
    }

    return (await response.json()) as T;
}

export async function postJson<T>(
    url: string,
    body: Record<string, unknown>,
): Promise<T> {
    const token = document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(token ? { 'X-CSRF-TOKEN': token } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw await parseError(response);
    }

    return (await response.json()) as T;
}
