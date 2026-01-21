
import { Pool } from "pg";
import { env } from "../../config/env";
import { Shipment, ShipmentStatus } from "./shipment.types";

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
        const result = await pool.query(query, values);
        return mapRowToShipment(result.rows[0]);
    },

    async findById(id: string): Promise<Shipment | null> {
        let query = 'SELECT order_id, customer_name, status FROM shipments WHERE id = $1';
        const values = [id];
        const result = await pool.query(query, values);
        return mapRowToShipment(result.rows[0]) || null
    },

    async findAll(filters?: any, pagination?: any): Promise<{ data: Shipment[], page: number, limit: number, total: number | null}> {
        const page = Math.max(1, Math.min(1000000, Number(pagination?.page ?? 1)));
        const limit = Math.max(1, Math.min(100, Number(pagination?.limit ?? 10)));
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM shipments';

        const conditions: string[] = [];
        const values: any[] = [];

        if (filters?.status) {
            values.push(filters.status);
            conditions.push(`status = $${values.length}`);
        }

        if (filters?.customerName) {
            values.push(`%${filters.customerName}%`);
            conditions.push(`customer_name ILIKE $${values.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        values.push(limit);
        values.push(offset);

        query += ` ORDER BY order_id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

        const result = await pool.query(query, values);

        const total = result.rowCount

        return { data: result.rows.map(mapRowToShipment), page, limit, total };
    },

    async updateStatus(id: string, status: string, lastSyncedAt: Date): Promise<Shipment | null>{
        let query = 'UPDATE shipments SET status = $2, last_synced_at = $3 WHERE id = $1 RETURNING *'
        const values = [id,status, lastSyncedAt]
        const result = await pool.query(query, values)
        return result.rowCount ? mapRowToShipment(result.rows[0]) : null
    },

    // Get shipments with status 'pending' or 'in_transit' for syncing
    async listActiveForSync(limit = 500): Promise<Shipment[]>{
        const safeLimit = Math.max(1, Math.min(1000, limit))
        
        let query = "SELECT * FROM shipments WHERE status in ('pending', 'in_transit')"+
                    " ORDER BY COALESCE(last_synced_at, created_at) ASC LIMIT $1"
        
        const values = [safeLimit]

        const result = await pool.query(query, values)

        return result.rows.map(mapRowToShipment)

    }
}