import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';

const requestContext = new AsyncLocalStorage<AbortSignal>();

export function getRequestSignal(): AbortSignal | undefined {
  return requestContext.getStore();
}

export function requestCancellation() {
  return (req: Request, res: Response, next: NextFunction) => {
    const controller = new AbortController();
    const abort = () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };

    req.once('aborted', abort);
    req.once('close', () => {
      if (!req.complete) abort();
    });
    res.once('close', () => {
      if (!res.writableFinished) abort();
    });

    requestContext.run(controller.signal, next);
  };
}
