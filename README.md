# Gas Cylinder Lifecycle Management Platform (CylinderFlow Ops)

A full-stack operations and compliance management platform engineered for industrial, medical, and specialty gas suppliers. Manage cylinder assets, customer deliveries, automated manifold refilling, periodic hydrostatic testing, ultrasonic leak inspections, and customer returns with an immutable lifecycle audit trail.

---

## Key Features

1. **Operations Dashboard**
   - Fleet-wide metrics: Total fleet, available filled, in manifold refill, in transit, with customer, overdue returns, under maintenance, and safety locked.
   - Low-stock warnings and critical periodic inspection alerts.
   - Live immutable activity stream recording real-time operations.

2. **Cylinder Inventory Management**
   - Complete tracking for all cylinders (ID, serial number, barcode, gas type & grade, water capacity, working pressure, tare weight, location, inspection due date).
   - Code-128 & Digital Tag visualizer with instant barcode lookup.
   - Comprehensive filter bar (Status, Gas Type, Depot Location, Overdue Inspections).
   - Full lifecycle history timeline showing who performed each action, when, and where.

3. **Customer & Delivery Logistics**
   - Customer facility directory with real-time cylinder holding balances.
   - Delivery order lifecycle: `Pending` &rarr; `Dispatched` &rarr; `Delivered` (or `Failed`).
   - Driver & logistics truck assignment with dispatch notes.
   - **Safety Enforcement**: Order creation strictly prevents assigning cylinders that are safety flagged, leaking, or overdue for inspection.

4. **Customer Cylinder Returns**
   - Log returned cylinders with physical condition inspection: Nominal Empty, Valve Issue, Structural Damage, or Suspected Leak.
   - Defective or leaking returned cylinders automatically trigger an **emergency safety quarantine lock** and schedule an urgent inspection.
   - Automatic customer cylinder balance reconciliation.

5. **Refilling Operations & Quality Manifolds**
   - Track cylinder refill batches, target fill pressures (bar), and certified purity percentages.
   - Operator sign-off with Pass/Fail recording.
   - **Safety Enforcement**: Rejects refilling on any cylinder with an active safety flag or overdue statutory inspection.

6. **Maintenance, Leak Testing & Safety Quarantine**
   - Quarantine holding cell isolating hazardous assets.
   - Support for 5-Year/10-Year Periodic Hydrostatic Volumetric Expansion Tests, Ultrasonic Sniffer Leak Checks, Valve Overhauls, and Tare Weight Verification.
   - Certificate number recording and next due date calculation.
   - Authorized technician sign-off workflow to clear safety locks.

7. **Operations & Compliance Reports**
   - Fleet inventory distribution by gas type, grade, and capacity.
   - Periodic testing pass/fail compliance and leak incidence rates.
   - Refill manifold throughput, purity averages, and pressure stats.
   - 1-Click CSV export for all reports.

8. **Role-Based Access Control (RBAC)**
   - **Admin**: Full administrative privileges across all operations.
   - **Inventory Manager**: Cylinder commissioning, refilling batches, and delivery orders.
   - **Delivery Staff**: Order dispatching, on-site drop-offs, and customer returns.
   - **Technician**: Hydrostatic testing, leak checks, safety flags, and quarantine clearance.

---

## Seed & Demo Accounts

All demo accounts use password: `gas12345`

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Sarah Jenkins | `admin@cylindertrack.io` | `gas12345` |
| **Inventory Manager** | Marcus Vance | `inventory@cylindertrack.io` | `gas12345` |
| **Delivery Staff** | Dave Rodriguez | `delivery@cylindertrack.io` | `gas12345` |
| **Technician** | Elena Rostova | `tech@cylindertrack.io` | `gas12345` |

*A 1-click Demo Role Switcher is available in the top bar to test workflows from each role's perspective.*

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend**: Node.js, Express, tsx.
- **Database**: SQLite (via `better-sqlite3`) with WAL journal mode and auto-migration/seeding.
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing and role validation middleware.

---

## Quick Start & Running the Platform

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
Starts the Express API and mounts the Vite dev server on port 3000:
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
npm start
```

### 4. Database Setup & Seeding
The database (`gas_cylinders.db`) is automatically initialized, schema-migrated, and seeded with realistic gas supplier data on server startup if not present. No manual SQL script execution required.
