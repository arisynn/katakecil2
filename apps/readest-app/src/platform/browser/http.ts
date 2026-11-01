/** Browser requests keep the browser's normal CORS and TLS protection. */
export interface ClientOptions {
  danger?: { acceptInvalidCerts?: boolean; acceptInvalidHostnames?: boolean };
  maxRedirections?: number;
  connectTimeout?: number;
}
export const fetch = (
  input: RequestInfo | URL,
  init?: RequestInit & ClientOptions,
): Promise<Response> => {
  if (!init) return globalThis.fetch(input);
  const {
    danger: _danger,
    maxRedirections: _redirects,
    connectTimeout: _timeout,
    ...options
  } = init;
  return globalThis.fetch(input, options);
};
