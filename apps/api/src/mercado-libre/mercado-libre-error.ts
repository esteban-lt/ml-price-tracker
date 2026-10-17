import { BadGatewayException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

// Error interno de una petición a Mercado Libre: conserva el código para decidir qué hacer,
// pero nunca llega al cliente tal cual (ver toClientException).
export class MercadoLibreRequestError extends Error {
  constructor(readonly status: number | undefined) {
    super(`Mercado Libre respondió ${status ?? 'sin respuesta'}`);
  }
}

// Mensajes genéricos para el cliente; el detalle ya quedó en el log.
export function toClientException(error: unknown): unknown {
  if (!(error instanceof MercadoLibreRequestError)) return error;

  if (error.status === HttpStatus.NOT_FOUND) return new NotFoundException('No se encontró en Mercado Libre');
  if (error.status === HttpStatus.TOO_MANY_REQUESTS) {
    return new HttpException('Mercado Libre está recibiendo demasiadas peticiones; intenta más tarde', HttpStatus.TOO_MANY_REQUESTS);
  }
  return new BadGatewayException('Mercado Libre no respondió correctamente; intenta más tarde');
}

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
