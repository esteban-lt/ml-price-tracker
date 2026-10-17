export interface MercadoLibreErrorDetail {
  status?: number;
  code?: string;
  message: string;
}

interface HttpErrorLike {
  message?: string;
  response?: { status?: number; data?: unknown };
}

export function describeMercadoLibreError(error: unknown): MercadoLibreErrorDetail {
  const { message, response } = error as HttpErrorLike;
  const data = (response?.data ?? {}) as { error?: unknown; message?: unknown };

  return {
    status: response?.status,
    code: typeof data.error === 'string' ? data.error : undefined,
    message: typeof data.message === 'string' ? data.message : (message ?? 'Error desconocido'),
  };
}

export function formatMercadoLibreError(method: string, path: string, detail: MercadoLibreErrorDetail): string {
  const code = detail.code ? `${detail.code}: ` : '';
  return `${method} ${path} de Mercado Libre respondió ${detail.status ?? 'sin respuesta'} - ${code}${detail.message}`;
}
