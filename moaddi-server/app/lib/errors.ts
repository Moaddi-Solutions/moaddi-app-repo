export type HttpError = Error & { statusCode: number };

export const repoError = (statusCode: number, message: string): HttpError => {
  const e = new Error(message) as HttpError;
  e.statusCode = statusCode;
  return e;
};
