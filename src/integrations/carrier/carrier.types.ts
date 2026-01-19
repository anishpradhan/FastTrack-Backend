/**
 Carrier types represent external system which should be flexible and not overly strict because real carrier APIs can change independently
 */

 
export interface CarrierShipment {
    id: string,
    status: string,
    orderId?: string,
    destination: string,
    updatedAt?: string,
}

// Payload sent to carrier api when registering shipment
export interface RegisterCarrierShipmentPayload {
    orderId: string,
    destination: string
}

export interface CarrierShipmentResponse {
    id: string,
    status: string;
}