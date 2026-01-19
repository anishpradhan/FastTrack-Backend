import { FastifyInstance } from "fastify";
import { ShipmentController } from "./shipment.controller";

export async function shipmentRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    customerName: { type: 'string' },
                    page: { type: 'number' },
                    limit: { type: 'number' },
                }
            }
        }
        , handler: ShipmentController.getAll
    }),
        fastify.get('/:id', {
            schema:{
                params:{
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: {type: 'string'}
                    }
                }
            }
        , handler:ShipmentController.getById
    }),
        fastify.post('/', {
            schema: {
                body: { 
                    type: 'object',
                    required: ['orderId', 'customerName', 'destination'],
                    properties: {
                        orderId: { type: 'string' },
                        customerName: { type: 'string' },
                        destination: { type: 'string' },
                    }
                }
            }
            , handler: ShipmentController.create
        }),
        fastify.get('/sync', {
            handler: ShipmentController.sync
        })

}