# FastTrack Backend

A Node.js backend service for managing shipment tracking with automatic synchronization from carrier APIs. Built with Fastify, PostgreSQL, and TypeScript.

## Setup Instructions

### Prerequisites
- Node.js (>=24) 
- PostgreSQL 13+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone https://github.com/anishpradhan/FastTrack-Backend.git

cd FastTrack-Backend

npm install

cd mocks/carrier-api

npm install
```

2. **Environment configuration:**
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fasttrack"

# Carrier API
CARRIERS_API_BASE_URL="http://localhost:4001"

# Sync Job
SYNC_INTERVAL_MINUTES=1
```

3. **Setup PostgreSQL Database:**
   
##### Option A: Docker (recommended)
```bash
docker compose up -d
```
- Create database schema:
```bash
npm run db:migrate
```

##### Option B: Local Postgres

- Create a database named "fasttrack" and update DATABASE_URL in .env accordingly. 
- Create database schema:
```bash
psql "$DATABASE_URL" -f migrations/001_init.sql 
```


### Development

Start the development servers (API + mock carrier API):
```bash
npm run dev
```

This runs:
- Main API on `http://localhost:3000`
- Mock carrier API on `http://localhost:4001`

If you want to run individual servers:
```bash
npm run dev:api      # Only main API
npm run dev:carrier  # Only mock carrier API
```

### Production

Build and start:
```bash
npm run build
npm start
```

### Testing

Run all tests:
```bash
npm test
```

Run specific test suite:
```bash
npm test -- src/modules/shipments/tests/shipment.sync.test.ts
```

## Architecture Overview

### Project Structure

```
src/
├── app.ts                          # Fastify app setup
├── server.ts                       # Server entry point
├── config/
│   ├── env.ts                     # Environment variables
│   └── logger.ts                  # Pino logger configuration
├── integrations/
│   └── carrier/
│       ├── carrier.client.ts      # HTTP client for carrier API
│       └── carrier.types.ts       # Carrier API types
├── jobs/
│   └── syncShipments.job.ts       # Cron job for sync
├── modules/
│   └── shipments/
│       ├── shipment.controller.ts # HTTP route handlers
│       ├── shipment.service.ts    # Business logic (sync logic)
│       ├── shipment.repository.ts # Database access layer
│       ├── shipment.routes.ts     # Route definitions
│       ├── shipment.types.ts      # TypeScript interfaces
│       └── tests/
│           └── shipment.sync.test.ts # Sync logic tests
└── utils/
    └── retry.ts                    # Exponential backoff retry logic
```


## API Endpoints

### Create Shipment
```bash
POST /shipments
Content-Type: application/json

{
  "orderId": "order_1",
  "customerName": "Anish",
  "destination": "Abu Dhabi, UAE"
}
```

### List Shipments
```bash
GET http://localhost:3000/shipments

GET http://localhost:3000/shipments?customerName=Anish

GET http://localhost:3000/shipments?status=pending&skip=0&limit=10
```

### Get Shipment
```bash
GET http://localhost:3000/shipments/:id
```

## Carrier API Endpoints

### Get Shipment
```bash
GET http://localhost:4001/carrier/shipments/order_1
```

### Update Shipment Status
```bash
PATCH http://localhost:4001/carrier/shipments/order_1
Content-Type: application/json

{
   "status": "in_transit"
}
```


### Core Components

#### Shipment Service (`shipment.service.ts`)
- **`createShipment()`**: Creates a new shipment and registers with carrier
- **`listShipments()`**: Retrieves shipments with filtering and pagination
- **`getShipmentById()`**: Fetches a single shipment
- **`syncAll()`**: Synchronizes all active shipments with carrier status

#### Carrier Client (`carrier.client.ts`)
- Handles HTTP communication with carrier API
- Implements exponential backoff retry logic
- Parses retry-after headers
- Supports request timeouts

#### Sync Job (`syncShipments.job.ts`)
- Runs on configurable schedule (cron)
- Prevents overlapping executions
- Logs sync progress and errors

#### Repository (`shipment.repository.ts`)
- Database abstraction layer
- CRUD operations
- Status queries for sync

### Data Flow

```
HTTP Request
    ↓
Route Handler (shipment.controller.ts)
    ↓
Service Layer (shipment.service.ts)
    ↓
Repository (shipment.repository.ts) ← → Database (PostgreSQL)
    ↓
Carrier Client (carrier.client.ts) ← → Carrier API (HTTP)
    ↓
HTTP Response
```


## Design Choices

### 1. **Service-Repository Pattern**
- Clean separation in layers
- Business logic in service layer
- Data access in repository layer
- Easier testing and maintenance

### 2. **Status Validation with Mapping**
```typescript
const VALID_STATUSES: ShipmentStatus[] = ["pending", "in_transit", "delivered", "failed"];

// Maps invalid carrier statuses to 'failed'
const mapped = VALID_STATUSES.includes(carrierStatus) ? carrierStatus : 'failed';
```
- Prevents invalid status values in database
- Ensures type safety

### 3. **Exponential Backoff with Jitter**
```typescript
// Retry configuration
{
  retries: 3,
  minDelayMs: 1000,
  maxDelayMs: 30000,
  factor: 2
}
```
- Handles temporary carrier API failures
- Respects HTTP 429 (rate limit) and 5xx responses
- Uses retry-after headers when available
- Jitter prevents thundering herd problem

### 4. **Non-Blocking Sync Job**
- Cron-based scheduling with `node-cron`
- Prevents concurrent sync runs with flag
- Continues processing on individual shipment failures
- Logs comprehensive sync metrics

### 5. **Request Timeouts**
- AbortController for request cancellation
- Prevents hanging requests
- Configurable timeout per carrier

## How to Run Synchronization

### Automatic Sync

Sync runs automatically on a configured schedule:

```bash
# Default: every 1 minute (set via SYNC_INTERVAL_MINUTES)
SYNC_INTERVAL_MINUTES=1 
```

The sync job:
1. Fetches active shipments in batches (200 per query)
2. Queries carrier for latest status
3. Validates status against known values
4. Updates local database if status changed
5. Logs all operations and errors

### Manual Sync via API

Trigger sync manually (if endpoint exposed):
```bash
http://localhost:3000/shipments/sync
```


### Testing Sync Logic

Run comprehensive sync tests:
```bash
npm test -- shipment.sync.test.ts
```

Test coverage includes:
- ✓ Empty shipment lists
- ✓ Status changes
- ✓ Unchanged statuses
- ✓ Invalid status mapping
- ✓ Missing orderId skipping

### Sync Configuration

Tune sync behavior in environment or code:

```typescript
// src/jobs/syncShipments.job.ts
const expression = buildCronExpression(intervalMinutes);

// Batch size: src/modules/shipments/shipment.service.ts
const shipments = await ShipmentRepository.listActiveForSync(200);

// Retry strategy: src/integrations/carrier/carrier.client.ts
const retryOpts = {
  retries: 3,           // Max retry attempts
  minDelayMs: 1000,     // Initial delay
  maxDelayMs: 30000,    // Max delay
  factor: 2             // Exponential backoff multiplier
};
```

## Technologies

- **Framework**: Fastify
- **Database**: PostgreSQL
- **HTTP Client**: Axios
- **Task Scheduler**: node-cron
- **Language**: TypeScript
- **Carrier API**: json-server
- **Logger**: Pino
- **Testing**: Jest
- **Retry Logic**: Exponential backoff with jitter

