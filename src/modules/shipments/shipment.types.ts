export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'failed'

export interface Shipment {
    id: string; //UUID
    orderId: string;
    customerName: string;
    destination: string;
    status: ShipmentStatus;
    lastSyncedAt?: Date 
}
