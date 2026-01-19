import cron from 'node-cron'
import { FastifyBaseLogger } from 'fastify'
import { ShipmentService } from '../modules/shipments/shipment.service'

function buildCronExpression(intervalMinutes: number) {

    // Clamped to [1..60] for safety   
    const n = Math.max(1, Math.min(60, Math.floor(intervalMinutes)))
    return `*/${n} * * * *`
}

export function startSyncJob(logger: FastifyBaseLogger, intervalMinutes: number) {
    const expression = buildCronExpression(intervalMinutes)
    logger.info({ expression, intervalMinutes }, 'Sync job scheduled')

    // To prevent overlapping runs
    let running = false

    cron.schedule(expression, async () => {
        if (running) {
            logger.warn('Sync job skipped: previous run still in progress')
            return
        }

        running = true
        const startedAt = Date.now()

        try {
            logger.info('Sync job started')
            const result = await ShipmentService.syncAll()
            logger.info({ ...result, durationMs: Date.now() - startedAt }, 'Sync job finished')
        }
        catch (err) {
            logger.error({ err }, 'Sync job failed')
        } finally {
            running = false
        }
    })
}