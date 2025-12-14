import { Injectable, Logger, Scope } from '@nestjs/common';
import { ILogger } from '../interfaces/logger.interface';

@Injectable({ scope: Scope.TRANSIENT })
export class NestLoggerService implements ILogger {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context);
  }
}
