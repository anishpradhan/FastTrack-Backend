import axios, { AxiosInstance } from "axios"
import { RegisterCarrierShipmentPayload, CarrierShipmentResponse, CarrierShipment } from "./carrier.types"
import { env } from "../../config/env";
import { CreateShipmentInput } from "../../modules/shipments/shipment.types";
import { randomUUID } from "node:crypto";
// export type CarrierClientConfig = {

// }

const customAxios: AxiosInstance = axios.create({
    baseURL: env.CARRIERS_API_BASE_URL.replace(/\/+$/, ''), // Remove trailing slash if any
    headers: { 'content-type': 'application/json' }
})
export const CarrierClient = {
    async registerShipment(payload: Omit<CreateShipmentInput, 'customerName'>): Promise<CarrierShipmentResponse> {
        const res = await customAxios.post('/carrier/shipments', { ...payload, status: 'pending' })
        return res.data
    },

    async getShipment(orderId: string): Promise<CarrierShipment> {
        const res = await customAxios.get(`/carrier/shipments/${orderId}`)
        return {
            id: String(res.data.id),
            status: String(res.data.status),
            orderId: res.data.orderId,
            destination: res.data.destination,
            updatedAt: res.data.updatedAt,
        }
    },

    async updateShipment(orderId: string, status: string): Promise<CarrierShipment> {
        const res = await customAxios.patch(`/carrier/shipments/${orderId}`, {status})
        return res.data
    }
}