import { randomUUID } from "node:crypto";
import { ShipmentRepository } from "./shipment.repository";
import { CreateShipmentInput, Shipment, GetShipmentQuery, ShipmentStatus } from "./shipment.types";
import { CarrierClient } from "../../integrations/carrier/carrier.client";
import { logger } from "../../config/logger";


const VALID_STATUSES: ShipmentStatus[] = ["pending", "in_transit", "delivered", "failed"]

export const ShipmentService = {
    async createShipment(payload: CreateShipmentInput): Promise<Shipment> {
        const id = randomUUID();

        // Create locally first
        const shipment = await ShipmentRepository.create({
            id,
            orderId: payload.orderId,
            customerName: payload.customerName,
            destination: payload.destination,
            status: 'pending'
        });

        // Register with carrier
        try {
            // perform carrier api call to register shipment
            const carrierResponse = await CarrierClient.registerShipment({
                orderId: payload.orderId,
                destination: payload.destination,
            })

            if (carrierResponse.status) {
                const mapped = VALID_STATUSES.includes(carrierResponse.status as ShipmentStatus) ? carrierResponse.status : 'failed'
                if (mapped !== shipment.status) {
                    await ShipmentRepository.updateStatus(shipment.id, mapped, new Date())
                }
            }

            logger?.info?.(`shipmentId: ${shipment.id} created and registered with carrier as ${carrierResponse.id}`);

        }
        catch (err) {
            // catch error and log 
            await ShipmentRepository.updateStatus(shipment.id, 'failed', new Date())
            logger?.error?.({ err, shipmentId: shipment.id }, `Carrier registration failed`);
        }

        // Return latest state
        const latest = await ShipmentRepository.findById(shipment.id);
        if (!latest) {
            throw new Error('Created shipment not found');
        }
        return latest;
    },

    async listShipments(filters?: any, pagination?: any) {
        return ShipmentRepository.findAll(filters, pagination);
    },

    async getShipmentById(id: string): Promise<Shipment | null> {
        return ShipmentRepository.findById(id);
    },

    async syncAll(): Promise<{
        checked: number;
        updated: number;
        failed: number;
    }> {
        const shipments = await ShipmentRepository.listActiveForSync(200)

        let updated = 0
        let failed = 0

        for (const shipment of shipments) {
            try {
                if (!shipment.orderId) {
                    logger?.warn?.({ shipmentId: shipment.id }, `Skipping sync, Missing shipment ID`)
                    continue
                }

                const carrierShipmentData = await CarrierClient.getShipment(shipment.orderId)

                // Verify and map status
                const newStatus = VALID_STATUSES.includes(carrierShipmentData.status as ShipmentStatus) ? carrierShipmentData.status : 'failed'

                // Update local record if status changed
                if (newStatus !== shipment.status) {
                    await ShipmentRepository.updateStatus(shipment.id, newStatus, new Date())
                    updated++

                    logger?.info?.({ shipmentId: shipment.id, oldStatus: shipment.status, newStatus }, `Shipment status updated from carrier sync`)
                }
                else {
                    logger?.debug?.({ shipmentId: shipment.id, status: shipment.status }, `Shipment status unchanged`)
                }
            }
            catch (err) {
                failed++
                logger?.error?.({ err, shipmentId: shipment.id }, `Failed to sync shipment`);
            }
        }
        return {
            checked: shipments.length,
            updated,
            failed
        }
    }
}
