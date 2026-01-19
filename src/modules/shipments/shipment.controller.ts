import { FastifyReply, FastifyRequest } from "fastify";
import { ShipmentService } from "./shipment.service";

export const ShipmentController = {

    create: async (req: FastifyRequest, reply: FastifyReply) => {
        const shipment = await ShipmentService.createShipment(req.body as any)
        return reply.code(201).send(shipment);
    },

    getAll: async (req: FastifyRequest<{Querystring: {status?: string, customerName?: string, page?: number, limit?: number}}>) => {
        const filters = {
            status: req.query.status,
            customerName: req.query.customerName
        };
        const pagination = {
            page: req.query.page,
            limit: req.query.limit
        };
        const shipments = await ShipmentService.listShipments(filters, pagination);
        return shipments;
    },

    getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const shipment = await ShipmentService.getShipmentById(req.params.id)
        if (!shipment) {
            reply.status(404);
            return { message: 'Shipment not found' };
        }
        return shipment;
    },

    sync: async () => {
        const result = await ShipmentService.syncAll()
        return result
    }


}  