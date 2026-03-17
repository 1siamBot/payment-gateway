export function useGatewayApi() {
  const config = useRuntimeConfig();

  async function request<T>(path: string, options?: Parameters<typeof $fetch<T>>[1]) {
    try {
      return await $fetch<T>(path, {
        baseURL: config.public.apiBaseUrl,
        ...options,
      });
    } catch (error: any) {
      const message = error?.data?.message || error?.message || 'Request failed';
      throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  return { request };
}
