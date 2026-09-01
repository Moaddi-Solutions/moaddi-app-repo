# Vendor Suppliers tab

**Approved:** 2026-08-30

## Goal

Vendors get a dedicated **Suppliers** menu to create and manage fill staff and assign machines.

## Design

- Resource `suppliers` via `makeUserResource` (same as Staff: `listRole: "custom"`, `roleMode: "custom"`).
- CASL subject remains `Staff` (tenant-scoped); no new server subject.
- Data provider aliases `suppliers` → same user CRUD as `staff`.
- Sidebar: **Suppliers** for Vendor; **Staff** stays for Super Admin / Shop Owner (not Vendor).
- Create/edit: pick custom role (Supplier template from Roles) + `supplierMachineIds` when role has `assigned-machine`.

## Out of scope

- Built-in Supplier role revival
- Changing fill authorization model
