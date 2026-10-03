import { createFetchClient, type ApiClient } from "./http";
import { createMockClient } from "./mock/transport";

/** Single API entry point. Set NEXT_PUBLIC_API_BASE_URL to talk to the real backend; otherwise the in-memory mock is used. */
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
export const api: ApiClient = baseUrl ? createFetchClient(baseUrl) : createMockClient();
