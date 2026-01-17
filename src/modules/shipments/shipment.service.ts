import { randomUUID } from "node:crypto";
import { ShipmentRepository } from "./shipment.repository";
import { ShipmentStatus, Shipment } from "./shipment.types";

export const ShipmentService = {
    async createShipment(data: Omit<Shipment, 'id' | 'createdAt'>): Promise<Shipment>{
        const id = randomUUID();
        const shipment = await ShipmentRepository.create({id, ...data, status: 'pending'});
        return shipment;
    },

    async getShipment(){
        return ShipmentRepository.findAll();
    }
}