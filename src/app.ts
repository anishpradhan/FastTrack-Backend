import Fastify from "fastify";
import { shipmentRoutes } from "./modules/shipments/shipment.routes";
import { startSyncJob } from "./jobs/syncShipments.job";
import { env } from "./config/env";
import { logger } from "./config/logger";

export const app = Fastify({
    logger: true
});

app.register(shipmentRoutes, {prefix: '/shipments'});

//Start the sync job
startSyncJob(logger, env.SYNC_INTERVAL_MINUTES)


