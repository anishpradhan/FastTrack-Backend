import { FastifyInstance } from "fastify";
import { ShipmentController } from "./shipment.controller";

export async function shipmentRoutes(fastify: FastifyInstance){
    fastify.get('/', ShipmentController.getAll)
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['orderId', 'customerName', 'destination'],
                properties: {
                    orderId: {type: 'string'},
                    customerName: {type: 'string'},
                    destination: {type: 'string'},
                }
            }
        }
    }, ShipmentController.create)
}