import { MailMessage } from '../../../src/mail/mail.service.js';

// Sustituye a MailService: guarda los mensajes en memoria y puede simular fallos.
export class FakeMailService {
  sent: MailMessage[] = [];
  private failure: (() => Error) | null = null;

  async send(message: MailMessage): Promise<void> {
    if (this.failure) throw this.failure();
    this.sent.push(message);
  }

  failWith(createError: () => Error): void {
    this.failure = createError;
  }

  reset(): void {
    this.sent = [];
    this.failure = null;
  }

  sentTo(email: string): MailMessage[] {
    return this.sent.filter((message) => message.to === email);
  }

  // Código de 6 dígitos del último correo de verificación enviado a `email`.
  lastCodeFor(email: string): string | undefined {
    return this.sentTo(email).at(-1)?.text.match(/\b\d{6}\b/)?.[0];
  }
}
