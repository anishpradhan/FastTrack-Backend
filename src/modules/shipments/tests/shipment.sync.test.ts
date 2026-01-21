import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { ShipmentStatus, Shipment } from "../shipment.types";

jest.mock("../shipment.repository");
jest.mock("../../../integrations/carrier/carrier.client");
jest.mock("../../../config/logger");

import { ShipmentService } from "../shipment.service";
import { ShipmentRepository } from '../shipment.repository';
import { CarrierClient } from '../../../integrations/carrier/carrier.client';

function makeShipment(partial: Partial<any> = {}) {
    return {
        id: 'shipment_123',
        orderId: 'order_123',
        customerName: 'Anish Pradhan',
        destination: 'Abu Dhabi, UAE',
        status: 'pending' as ShipmentStatus,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        ...partial,
    };
}

describe('ShipmentService.syncAll', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const mockListActiveForSync = jest.spyOn(ShipmentRepository, 'listActiveForSync') as jest.Mock;
    const mockUpdateStatus = jest.spyOn(ShipmentRepository, 'updateStatus') as jest.Mock;
    const mockGetShipment = jest.spyOn(CarrierClient, 'getShipment') as jest.Mock;

    test('returns correct counts when no shipments to sync', async () => {
        mockListActiveForSync.mockReturnValueOnce([]);

        const result = await ShipmentService.syncAll();

        expect(result).toEqual({
            checked: 0,
            updated: 0,
            failed: 0
        });
        expect(mockListActiveForSync).toHaveBeenCalledWith(200);
    });

    test('updates status when carrier shipment status changes', async () => {
        const shipment = makeShipment({ id: 'shipment_1', status: 'pending' as ShipmentStatus });

        mockListActiveForSync.mockReturnValueOnce([shipment]);
        mockGetShipment.mockReturnValueOnce({ status: 'in_transit' } as any);
        mockUpdateStatus.mockReturnValueOnce(
            makeShipment({ status: 'in_transit' as ShipmentStatus })
        );

        const result = await ShipmentService.syncAll();

        expect(result).toEqual({
            checked: 1,
            updated: 1,
            failed: 0
        });
        expect(mockGetShipment).toHaveBeenCalledWith(shipment.orderId);
        expect(mockUpdateStatus).toHaveBeenCalledWith(
            shipment.id,
            'in_transit',
            expect.any(Date)
        );
    });

    test('does not update status when shipment status unchanged', async () => {
        const shipment = makeShipment({ id: 'shipment_2', status: 'in_transit' as ShipmentStatus });

        mockListActiveForSync.mockReturnValueOnce([shipment]);
        mockGetShipment.mockReturnValueOnce({ status: 'in_transit' } as any);

        const result = await ShipmentService.syncAll();

        expect(result).toEqual({
            checked: 1,
            updated: 0,
            failed: 0
        });
        expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    test('maps invalid carrier status to failed', async () => {
        const shipment = makeShipment({ id: 'shipment_3', status: 'pending' as ShipmentStatus });

        mockListActiveForSync.mockReturnValueOnce([shipment]);
        mockGetShipment.mockReturnValueOnce({ status: 'unknown_status' } as any);
        mockUpdateStatus.mockReturnValueOnce(
            makeShipment({ status: 'failed' as ShipmentStatus })
        );

        const result = await ShipmentService.syncAll();

        expect(result).toEqual({
            checked: 1,
            updated: 1,
            failed: 0
        });
        expect(mockUpdateStatus).toHaveBeenCalledWith(
            shipment.id,
            'failed',
            expect.any(Date)
        );
    });


    test('skips shipments when orderId is missing', async () => {
        const shipmentWithoutOrderId = makeShipment({ id: 'shipment_6', orderId: '' });
        const validShipment = makeShipment({ id: 'shipment_7', orderId: 'order_7' });

        mockListActiveForSync.mockReturnValueOnce([
            shipmentWithoutOrderId,
            validShipment
        ]);
        mockGetShipment.mockReturnValueOnce({ status: 'in_transit' } as any);
        mockUpdateStatus.mockReturnValueOnce(
            makeShipment({ status: 'in_transit' as ShipmentStatus })
        );

        const result = await ShipmentService.syncAll();

        expect(result).toEqual({
            checked: 2,
            updated: 1,
            failed: 0
        });
        expect(mockGetShipment).toHaveBeenCalledTimes(1);
        expect(mockGetShipment).toHaveBeenCalledWith('order_7');
    });


});