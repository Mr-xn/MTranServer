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
    function cleanup() {
      req.removeListener('aborted', onReqAborted);
      req.removeListener('close', onReqClose);
      res.removeListener('close', onResClose);
      res.removeListener('finish', cleanup);
    }
    function onReqAborted() {
      abort();
      cleanup();
    }
    function onReqClose() {
      if (!res.writableFinished) abort();
      cleanup();
    }
    function onResClose() {
      if (!res.writableFinished) abort();
      cleanup();
    }

    req.once('aborted', onReqAborted);
    req.once('close', onReqClose);
    res.once('close', onResClose);
    res.once('finish', cleanup);

    requestContext.run(controller.signal, next);
  };
}
