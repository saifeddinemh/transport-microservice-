# 📡 Kafka Topics — agrofiel-transport-api

Documentation of all Kafka topics used by this service: the ones it publishes
(produced by transport-service) and the ones it listens to (produced by
hr-service and stock-service).

Every event follows the same standard envelope:

```json
{
  "eventId": "uuid",
  "eventName": "employee.created",
  "version": "1.0",
  "occurredAt": "2026-06-22T10:00:00.000Z",
  "source": "hr-service",
  "payload": {
    "employeeId": "uuid",
    "farmId": "uuid",
    "firstName": "Mohamed",
    "lastName": "Ait Ali",
    "role": "WORKER"
  }
}
```

---

## 📤 Topics produced by transport-service

### `agrofield.transport.shipment.created`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** creation of a shipment (`POST /api/shipments`)
- **Expected payload:**
  ```ts
  {
    shipmentId: string (uuid)
    requestId: string (uuid)
    farmId: string (uuid)
    status: string
    startLocation: string
    endLocation: string
    totalWeight: number
    totalCost: number
    estimatedArrival: string (ISO datetime)
    vehicleId?: string (uuid) | null
    driverId?: string (uuid) | null
    transportId?: string (uuid) | null
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000001",
    "eventName": "shipment.created",
    "version": "1.0",
    "occurredAt": "2026-07-05T10:00:00.000Z",
    "source": "transport-service",
    "payload": {
      "shipmentId": "9f1a2b3c-0000-0000-0000-000000000001",
      "requestId": "9f1a2b3c-0000-0000-0000-000000000002",
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "status": "PENDING",
      "startLocation": "Farm A",
      "endLocation": "Warehouse B",
      "totalWeight": 300,
      "totalCost": 450,
      "estimatedArrival": "2026-07-06T10:00:00.000Z",
      "vehicleId": "9f1a2b3c-0000-0000-0000-000000000004",
      "driverId": "9f1a2b3c-0000-0000-0000-000000000005",
      "transportId": null
    }
  }
  ```

### `agrofield.transport.shipment.statusUpdated`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** shipment status change (`PATCH /api/shipments/:id/status`)
- **Expected payload:**
  ```ts
  {
    shipmentId: string(uuid);
    farmId: string(uuid);
    previousStatus: string;
    newStatus: string;
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000002",
    "eventName": "shipment.statusUpdated",
    "version": "1.0",
    "occurredAt": "2026-07-05T11:00:00.000Z",
    "source": "transport-service",
    "payload": {
      "shipmentId": "9f1a2b3c-0000-0000-0000-000000000001",
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "previousStatus": "PENDING",
      "newStatus": "PLANNED"
    }
  }
  ```

### `agrofield.transport.deliveryProof.recorded`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** recording of a delivery proof (`POST /api/delivery-proofs`)
- **Expected payload:**
  ```ts
  {
    deliveryProofId: string (uuid)
    shipmentId: string (uuid)
    recipientName: string
    receivedAt: string (ISO datetime)
    isValid: boolean
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000003",
    "eventName": "deliveryProof.recorded",
    "version": "1.0",
    "occurredAt": "2026-07-06T11:00:00.000Z",
    "source": "transport-service",
    "payload": {
      "deliveryProofId": "9f1a2b3c-0000-0000-0000-000000000006",
      "shipmentId": "9f1a2b3c-0000-0000-0000-000000000001",
      "recipientName": "Warehouse Manager",
      "receivedAt": "2026-07-06T11:00:00.000Z",
      "isValid": true
    }
  }
  ```

### `agrofield.transport.request.created`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** creation of a transport request (`POST /api/transport-requests`)
- **Expected payload:**
  ```ts
  {
    transportRequestId: string (uuid)
    farmId: string (uuid)
    ownerId: string (uuid)
    employeeId?: string (uuid) | null
    source: string
    destination: string
    category: string
    weight: number
    requestDate: string (ISO datetime)
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000004",
    "eventName": "transportRequest.created",
    "version": "1.0",
    "occurredAt": "2026-07-05T09:00:00.000Z",
    "source": "transport-service",
    "payload": {
      "transportRequestId": "9f1a2b3c-0000-0000-0000-000000000002",
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "ownerId": "9f1a2b3c-0000-0000-0000-000000000007",
      "employeeId": null,
      "source": "Farm A",
      "destination": "Warehouse B",
      "category": "FERTILIZER",
      "weight": 300,
      "requestDate": "2026-07-05T00:00:00.000Z"
    }
  }
  ```

### `agrofield.transport.request.approved`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** approval of a transport request (`PATCH /api/transport-requests/:id/status`)
- **Expected payload:**
  ```ts
  {
    transportRequestId: string(uuid);
    farmId: string(uuid);
    status: "APPROVED";
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000005",
    "eventName": "transportRequest.approved",
    "version": "1.0",
    "occurredAt": "2026-07-05T09:30:00.000Z",
    "source": "transport-service",
    "payload": {
      "transportRequestId": "9f1a2b3c-0000-0000-0000-000000000002",
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "status": "APPROVED"
    }
  }
  ```

### `agrofield.transport.vehicle.statusChanged`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** vehicle status change (`PATCH /api/vehicles/:id/status`)
- **Expected payload:**
  ```ts
  {
    vehicleId: string(uuid);
    farmId: string(uuid);
    previousStatus: string;
    newStatus: string;
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000006",
    "eventName": "vehicle.statusChanged",
    "version": "1.0",
    "occurredAt": "2026-07-06T12:00:00.000Z",
    "source": "transport-service",
    "payload": {
      "vehicleId": "9f1a2b3c-0000-0000-0000-000000000004",
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "previousStatus": "AVAILABLE",
      "newStatus": "UNAVAILABLE"
    }
  }
  ```

### `agrofield.transport.maintenance.recorded`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** adding a maintenance log (`POST /api/maintenance-logs`)
- **Expected payload:**
  ```ts
  {
    maintenanceLogId: string (uuid)
    vehicleId: string (uuid)
    maintenanceType: string
    cost: number
    date: string (ISO datetime)
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000007",
    "eventName": "maintenanceLog.recorded",
    "version": "1.0",
    "occurredAt": "2026-07-02T08:00:00.000Z",
    "source": "transport-service",
    "payload": {
      "maintenanceLogId": "9f1a2b3c-0000-0000-0000-000000000008",
      "vehicleId": "9f1a2b3c-0000-0000-0000-000000000004",
      "maintenanceType": "Oil change",
      "cost": 350,
      "date": "2026-07-02T00:00:00.000Z"
    }
  }
  ```

### `agrofield.transport.driver.created`

- **Producer:** transport-service
- **Consumer:** none for now
- **Trigger:** creation of a driver (`POST /api/drivers`)
- **Expected payload:**
  ```ts
  {
    driverId: string(uuid);
    farmId: string(uuid);
    name: string;
    email: string;
    licenseNumber: string;
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "a1b2c3d4-0000-0000-0000-000000000008",
    "eventName": "driver.created",
    "version": "1.0",
    "occurredAt": "2026-07-05T09:00:00.000Z",
    "source": "transport-service",
    "payload": {
      "driverId": "9f1a2b3c-0000-0000-0000-000000000005",
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "name": "Test Driver",
      "email": "driver.test@test.com",
      "licenseNumber": "LIC-001"
    }
  }
  ```

---

## 📥 Topics consumed by transport-service

### `agrofield.owner.created`

- **Producer:** hr-service
- **Consumer:** transport-service (and stock-service)
- **Role:** locally synchronizes an `Owner` created in hr-service — required for the FK constraint used by `FarmOwner`.
- **Received payload:**
  ```ts
  {
    ownerId: string (uuid)
    email: string
    firstName: string
    lastName: string
    telephone: string
    birthDate: string (ISO datetime)
    password: string   // bcrypt hash, never the plaintext password
    salt: string
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "b1c2d3e4-0000-0000-0000-000000000001",
    "eventName": "owner.created",
    "version": "1.0",
    "occurredAt": "2026-07-05T13:46:38.552Z",
    "source": "hr-service",
    "payload": {
      "ownerId": "78fb09f5-56e7-4de5-8d5d-d9ab014846f3",
      "email": "sec.test@test.com",
      "firstName": "Sec",
      "lastName": "Test",
      "telephone": "0600000001",
      "birthDate": "1998-01-01T00:00:00.000Z",
      "password": "$2b$10$...",
      "salt": "$2b$10$..."
    }
  }
  ```

### `agrofield.owner.updated`

- **Producer:** hr-service
- **Consumer:** transport-service (and stock-service)
- **Role:** propagates a profile or password update to the local `Owner`. `changes` is filtered on the transport side through an allow-list of permitted fields before being applied.
- **Received payload:**
  ```ts
  {
    ownerId: string (uuid)
    changes: Record<string, unknown>   // e.g.: { firstName, lastName, ... } or { password, salt }
    updatedAt: string (ISO datetime)
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "b1c2d3e4-0000-0000-0000-000000000002",
    "eventName": "owner.updated",
    "version": "1.0",
    "occurredAt": "2026-07-05T13:49:49.410Z",
    "source": "hr-service",
    "payload": {
      "ownerId": "78fb09f5-56e7-4de5-8d5d-d9ab014846f3",
      "changes": {
        "firstName": "SecUpdated",
        "lastName": "Test",
        "telephone": "0600000001",
        "birthDate": "1998-01-01T00:00:00.000Z",
        "address": null,
        "country": null,
        "city": null,
        "postcode": null
      },
      "updatedAt": "2026-07-05T13:49:49.410Z"
    }
  }
  ```

### `agrofield.employee.created`

- **Producer:** hr-service
- **Consumer:** transport-service (and stock-service)
- **Role:** locally synchronizes an `Employee` created in hr-service.
- **Received payload:**
  ```ts
  {
    employeeId: string(uuid);
    farmId: string(uuid);
    firstName: string;
    lastName: string;
    role: string;
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "b1c2d3e4-0000-0000-0000-000000000003",
    "eventName": "employee.created",
    "version": "1.0",
    "occurredAt": "2026-06-22T10:00:00.000Z",
    "source": "hr-service",
    "payload": {
      "employeeId": "9f1a2b3c-0000-0000-0000-000000000009",
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "firstName": "Mohamed",
      "lastName": "Ait Ali",
      "role": "WORKER"
    }
  }
  ```

### `agrofield.farm.created`

- **Producer:** hr-service
- **Consumer:** transport-service (and stock-service)
- **Role:** locally synchronizes a `Farm` created in hr-service, and links the owner (`FarmOwner`) — a requirement for ownership checks (`verifyFarmOwnership`, etc.) to work on this service.
- **Received payload:**
  ```ts
  {
    farmId: string(uuid);
    name: string;
    ownerId: string(uuid);
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "b1c2d3e4-0000-0000-0000-000000000004",
    "eventName": "farm.created",
    "version": "1.0",
    "occurredAt": "2026-07-05T09:00:00.000Z",
    "source": "hr-service",
    "payload": {
      "farmId": "9f1a2b3c-0000-0000-0000-000000000003",
      "name": "Ferme Test79",
      "ownerId": "78fb09f5-56e7-4de5-8d5d-d9ab014846f3"
    }
  }
  ```

### `agrofield.stock.request.approved`

- **Producer:** stock-service
- **Consumer:** transport-service
- **Role:** notified when a stock request is approved. **Currently log-only mode** — the payload contains neither `farmId` nor `source`/`destination`/`category`/`requestDate`, so transport-service cannot yet automatically create a `TransportRequest` from this event alone (see `stockRequestApprovedHandler.ts`).
- **Received payload:**
  ```ts
  {
    stockRequestId: string (uuid)
    stockItemId: string (uuid)
    quantity: number
    unit: string
    decidedById?: string (uuid)
  }
  ```
- **Example:**
  ```json
  {
    "eventId": "b1c2d3e4-0000-0000-0000-000000000005",
    "eventName": "stockRequest.approved",
    "version": "1.0",
    "occurredAt": "2026-07-05T10:15:00.000Z",
    "source": "stock-service",
    "payload": {
      "stockRequestId": "9f1a2b3c-0000-0000-0000-00000000000a",
      "stockItemId": "9f1a2b3c-0000-0000-0000-00000000000b",
      "quantity": 100,
      "unit": "KG",
      "decidedById": "78fb09f5-56e7-4de5-8d5d-d9ab014846f3"
    }
  }
  ```

---

## 🗑️ Dead Letter Queue

### `agrofield.dlq`

- Any event that fails after exhausting retry attempts (`withRetry`) lands here, along with the original topic, the error, and the number of attempts — see `dlq.ts` and `retry.ts`.
- ⚠️ For `owner.created`/`owner.updated`, the original payload (including the hash + salt) is included as-is in the DLQ event — handle this topic with the same caution as the `owner.*` topics.
