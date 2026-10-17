import { Logger } from '@nestjs/common';

// Los servicios registran errores esperados (p. ej. un invalid_grant simulado); en los tests solo hacen ruido.
Logger.overrideLogger(false);
