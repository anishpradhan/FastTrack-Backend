import { FastifyReply, FastifyRequest } from "fastify";
import { ShipmentService } from "./shipment.service";

export const ShipmentController = {

    create: async(req:FastifyRequest, reply:FastifyReply) => {
        const shipment = await ShipmentService.createShipment(req.body as Omit<import("./shipment.types").Shipment, "id" | "createdAt">)
        return shipment;
    },
    
    getAll: async(req:FastifyRequest, reply:FastifyReply) => {
        const shipments = await ShipmentService.getShipment()
        return shipments;
    }
}  