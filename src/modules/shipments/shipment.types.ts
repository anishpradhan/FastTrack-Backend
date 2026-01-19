export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'failed';

export interface Shipment {
    id: string, //UUID
    orderId: string,
    customerName: string,
    destination: string,
    status: ShipmentStatus,
    lastSyncedAt?: Date ,
    createdAt: Date ,
}

export interface CreateShipmentInput {
    orderId: string,
    customerName: string,
    destination: string,
}

export interface GetShipmentQuery {
    id? : string,
    customerName? : string,
    status? : string,
    skip?: number,
    limit?: number
}