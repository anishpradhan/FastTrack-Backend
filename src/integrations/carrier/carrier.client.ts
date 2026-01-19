import axios, { AxiosError, AxiosInstance } from "axios"
import { RegisterCarrierShipmentPayload, CarrierShipmentResponse, CarrierShipment } from "./carrier.types"
import { env } from "../../config/env";
import { CreateShipmentInput } from "../../modules/shipments/shipment.types";
import { retry } from "../../utils/retry";

// Helper functions for retry logic
function isRetriable(err: unknown): boolean {
    const axiosError = err as AxiosError
    if (!axiosError?.isAxiosError) {
        return false
    }
    // Network errors
    if (!axiosError.response) {
        return true
    }
    // 5xx errors
    const status = axiosError.response.status

    return status === 429 || (status >= 500 && status < 600)

}

// Extract retry-after header in milliseconds
function getRetryAfterMs(err: unknown): number | null {
    const axiosError = err as AxiosError
    const retryAfter = axiosError?.response?.headers['retry-after']
    if (!retryAfter) {
        return null
    }
    const seconds = Number(retryAfter)
    if (!Number.isNaN(seconds)) {
        return seconds * 1000
    }

    const date = Date.parse(retryAfter)
    if (!Number.isNaN(date)) {
        const diff = date - Date.now()
        return diff > 0 ? diff : 0
    }

    return null
}

// Add timeout to axios requests
async function withTimeout<T>(timeoutMs: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fn(controller.signal);
    }
    finally {
        clearTimeout(t);
    }
}

// Axios instance with base config
const customAxios: AxiosInstance = axios.create({
    baseURL: env.CARRIERS_API_BASE_URL.replace(/\/+$/, ''), // Remove trailing slash if any
    headers: { 'content-type': 'application/json' }
})
const timeoutMs = 5000
const retries = 3

export const CarrierClient = {
    async registerShipment(payload: Omit<CreateShipmentInput, 'customerName'>): Promise<CarrierShipmentResponse> {
        return retry(
            async () => withTimeout(timeoutMs, async (signal) => {
                const res = await customAxios.post('/carrier/shipments', { ...payload, status: 'pending' }, { signal })
                return {
                    id: String(res.data.id),
                    status: String(res.data.status),
                }
            }),
            {
                retries,
                minDelayMs: 300,
                maxDelayMs: 5000,
                factor: 2
            },
            isRetriable,
            getRetryAfterMs

        )
    },

    async getShipment(orderId: string): Promise<CarrierShipment> {
        return retry(
            async () => withTimeout(timeoutMs, async (signal) => {
                const res = await customAxios.get(`/carrier/shipments/${orderId}`, { signal })
                return {
                    id: String(res.data.id),
                    status: String(res.data.status),
                    orderId: res.data.orderId,
                    destination: res.data.destination,
                    updatedAt: res.data.updatedAt,
                }
            }), {
            retries,
            minDelayMs: 300,
            maxDelayMs: 5000,
            factor: 2
        },
            isRetriable,
            getRetryAfterMs
        )
    },

    async updateShipment(orderId: string, status: string): Promise<CarrierShipment> {
        return retry(
            async () => withTimeout(timeoutMs, async (signal) => {
                const res = await customAxios.patch(`/carrier/shipments/${orderId}`, { status })
                return {
                    id: String(res.data.id),
                    status: String(res.data.status),
                    orderId: res.data.orderId,
                    destination: res.data.destination,
                    updatedAt: res.data.updatedAt,
                }
            }), {
            retries,
            minDelayMs: 300,
            maxDelayMs: 5000,
            factor: 2
        },
            isRetriable,
            getRetryAfterMs
        )
    }
}