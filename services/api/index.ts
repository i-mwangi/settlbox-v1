// Provides the same interface using native fetch so consuming code compiles.

import { PUBLIC_ROUTES } from "../utils/constant";

// Minimal type stubs matching what consumers expect from axios
interface AxiosRequestConfig {
  baseURL?: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  params?: any;
  data?: any;
  [key: string]: any;
}

interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

function extractErrorMessage(errorData: any): string {
  let message = "";

  if (Array.isArray(errorData?.message)) {
    const firstError = errorData.message[0];
    if (firstError?.constraints) {
      const constraintKey = Object.keys(firstError.constraints)[0];
      message = firstError.constraints[constraintKey];
    }
  } else if (errorData?.message) {
    message = errorData.message;
  } else {
    return "An Unexpected Error Occurred";
  }

  return message.charAt(0).toUpperCase() + message.slice(1);
}

export class AuthenticatedApiClient {
  private baseURL: string;
  private onUnauthenticated: () => void;

  constructor(baseURL: string, onUnauthenticated: () => void) {
    this.baseURL = baseURL;
    this.onUnauthenticated = onUnauthenticated;
  }

  private async request<T = any>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const fullUrl = `${this.baseURL}${url}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(config?.headers || {}),
    };

    const fetchConfig: RequestInit = {
      method,
      headers,
      credentials: "include", // equivalent to withCredentials: true
    };

    if (data !== undefined && method !== "GET") {
      fetchConfig.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(fullUrl, fetchConfig);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(`Request failed with status ${response.status}`);
        error.response = { status: response.status, data: errorData };
        error.config = { url };
        error.userMessage = extractErrorMessage(errorData);

        if (response.status === 401) {
          console.warn("Unauthorized (401) - redirecting to login...");
          this.onUnauthenticated();
        }

        console.error(`API Error ${response.status} on ${url}:`, errorData);
        throw error;
      }

      const responseData = await response.json().catch(() => ({}));
      return {
        data: responseData as T,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        config: config || {},
      };
    } catch (err: any) {
      if (err?.response) throw err; // already handled above
      throw err;
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>("GET", url, undefined, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>("POST", url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>("PUT", url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>("PATCH", url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>("DELETE", url, config?.data, config);
  }

  // Convenience methods that return data directly
  async getData<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.get<T>(url, config);
    return response.data;
  }

  async postData<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.post<T>(url, data, config);
    return response.data;
  }

  async putData<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.put<T>(url, data, config);
    return response.data;
  }

  async patchData<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.patch<T>(url, data, config);
    return response.data;
  }

  async deleteData<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.delete<T>(url, { ...config, data });
    return response.data;
  }
}

// Stub for the bare apiServer (previously axios.create)
const apiServer = {
  get: async (url: string, config?: any) => {
    const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || "";
    const res = await fetch(`${baseURL}${url}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    return { data, status: res.status };
  },
  post: async (url: string, body?: any, config?: any) => {
    const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || "";
    const res = await fetch(`${baseURL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    return { data, status: res.status };
  },
};

const apiServerWithAuth = new AuthenticatedApiClient(
  process.env.NEXT_PUBLIC_SERVER_URL || "",
  () => {
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname || "";
    const isPublic = PUBLIC_ROUTES.some(route => currentPath.startsWith(route));
    if (!isPublic) {
      console.log("Redirecting to login due to 401 error");
      window.location.href = "/login";
    }
  },
);

export { apiServer, apiServerWithAuth };
