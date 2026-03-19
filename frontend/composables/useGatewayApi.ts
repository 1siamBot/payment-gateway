export function useGatewayApi() {
  const config = useRuntimeConfig();

  async function request<T>(path: string, options?: Parameters<typeof $fetch<T>>[1]) {
    try {
      return await $fetch<T>(path, {
        baseURL: config.public.apiBaseUrl,
        ...options,
      });
    } catch (error: any) {
      const payload = error?.data;
      const rawMessage = payload?.message ?? error?.message ?? 'Request failed';
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : JSON.stringify(rawMessage);
      const wrapped = new Error(message) as Error & { payload?: unknown; statusCode?: number };
      wrapped.payload = payload;
      wrapped.statusCode = payload?.statusCode ?? error?.statusCode;
      throw wrapped;
    }
  }

  return { request };
}
