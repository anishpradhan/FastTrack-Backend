import Fastify from "fastify";
import { shipmentRoutes } from "./modules/shipments/shipment.routes";

export const app = Fastify({
    logger:true
});

app.register(shipmentRoutes, {prefix: '/shipments'});
app.get('/health', async () => ({status: 'ok'}));


