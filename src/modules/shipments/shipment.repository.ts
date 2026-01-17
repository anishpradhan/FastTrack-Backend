
import { Pool } from "pg";
import { env } from "../../config/env";

import { Shipment, ShipmentStatus } from "./shipment.types";
// import { v4 as uuidv4 } from 'uuid';



// Setup Postgres connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

// Helper to map DB row to Shipment type
function mapRowToShipment(row: any): Shipment {
  return {
    id: row.id,
    orderId: row.order_id,
    customerName: row.customer_name,
    destination: row.destination,
    status: row.status as ShipmentStatus,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at
  };
}

export const ShipmentRepository = {

    async create(shipmentData: Omit<Shipment, 'createdAt'>): Promise<Shipment> {
        const query = `
            INSERT INTO shipments (
                id,
                order_id,
                customer_name,
                destination,
                status
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            shipmentData.id,
            shipmentData.orderId,
            shipmentData.customerName,
            shipmentData.destination,
            shipmentData.status
        ];
        console.log(query, values);
        const result = await pool.query(query, values);
        return mapRowToShipment(result.rows[0]);
    },

    async findAll(skip = 0, limit = 10, status?: ShipmentStatus, customerName?: string): Promise<Shipment[]> {
        let query = 'SELECT * FROM shipments';
        const conditions: string[] = [];
        const values: any[] = [];

        if (status) {
            values.push(status);
            conditions.push(`status = $${values.length}`);
        }

        if (customerName) {
            values.push(`%${customerName}%`);
            conditions.push(`customer_name ILIKE $${values.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        values.push(limit);
        values.push(skip);

        query += ` ORDER BY order_id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

   
        // console.log(query)
        const result = await pool.query(query, values);
        return result.rows.map(mapRowToShipment);
    },
}