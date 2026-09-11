-- ============================================================
-- VETSTOCK POSTGRESQL DATABASE SCHEMA
-- Supabase PostgreSQL
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CLINICS
-- ============================================================

CREATE TABLE IF NOT EXISTS clinics (
    clinic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name VARCHAR(150) NOT NULL,
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(clinic_id)
        ON DELETE SET NULL,
    role_id UUID REFERENCES roles(role_id)
        ON DELETE SET NULL,

    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    first_name VARCHAR(100),
    last_name VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_login TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,

    performance_rating NUMERIC(3,2)
        CHECK (performance_rating >= 0
        AND performance_rating <= 5),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVENTORY ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    clinic_id UUID NOT NULL
        REFERENCES clinics(clinic_id)
        ON DELETE CASCADE,

    supplier_id UUID
        REFERENCES suppliers(supplier_id)
        ON DELETE SET NULL,

    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50),

    unit_price NUMERIC(12,2)
        NOT NULL DEFAULT 0
        CHECK (unit_price >= 0),

    cost_price NUMERIC(12,2)
        NOT NULL DEFAULT 0
        CHECK (cost_price >= 0),

    min_stock_level INTEGER
        NOT NULL DEFAULT 0
        CHECK (min_stock_level >= 0),

    max_stock_level INTEGER
        NOT NULL DEFAULT 0
        CHECK (max_stock_level >= 0),

    reorder_point INTEGER
        NOT NULL DEFAULT 0
        CHECK (reorder_point >= 0),

    storage_conditions TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVENTORY BATCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES inventory_items(item_id)
        ON DELETE CASCADE,

    batch_number VARCHAR(100) NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 0
        CHECK (quantity >= 0),

    expiration_date DATE,

    received_date DATE NOT NULL DEFAULT CURRENT_DATE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(item_id, batch_number)
);

-- ============================================================
-- PATIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    clinic_id UUID NOT NULL
        REFERENCES clinics(clinic_id)
        ON DELETE CASCADE,

    patient_name VARCHAR(150) NOT NULL,

    species VARCHAR(50),
    breed VARCHAR(100),

    date_of_birth DATE,
    gender VARCHAR(30),

    is_neutered BOOLEAN NOT NULL DEFAULT FALSE,

    microchip_number VARCHAR(100),

    owner_name VARCHAR(150),
    owner_phone VARCHAR(30),
    owner_email VARCHAR(150),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HEALTH RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS health_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    patient_id UUID NOT NULL
        REFERENCES patients(patient_id)
        ON DELETE CASCADE,

    veterinarian_id UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    diagnosis TEXT,

    symptoms TEXT[],

    treatment_notes TEXT,

    follow_up_date DATE,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    patient_id UUID NOT NULL
        REFERENCES patients(patient_id)
        ON DELETE CASCADE,

    veterinarian_id UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    issued_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expiry_date DATE,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    refills INTEGER NOT NULL DEFAULT 0
        CHECK (refills >= 0),

    max_refills INTEGER NOT NULL DEFAULT 0
        CHECK (max_refills >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRESCRIPTION ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS prescription_items (
    prescription_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    prescription_id UUID NOT NULL
        REFERENCES prescriptions(prescription_id)
        ON DELETE CASCADE,

    item_id UUID NOT NULL
        REFERENCES inventory_items(item_id)
        ON DELETE RESTRICT,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    dosage TEXT,

    instructions TEXT
);

-- ============================================================
-- STOCK TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES inventory_items(item_id)
        ON DELETE RESTRICT,

    batch_id UUID
        REFERENCES inventory_batches(batch_id)
        ON DELETE SET NULL,

    user_id UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    patient_id UUID
        REFERENCES patients(patient_id)
        ON DELETE SET NULL,

    prescription_id UUID
        REFERENCES prescriptions(prescription_id)
        ON DELETE SET NULL,

    transaction_type VARCHAR(50) NOT NULL,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    previous_stock INTEGER,
    new_stock INTEGER,

    unit_price NUMERIC(12,2)
        CHECK (unit_price >= 0),

    total_value NUMERIC(12,2)
        CHECK (total_value >= 0),

    reason TEXT,

    ip_address INET,
    device_info TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    clinic_id UUID NOT NULL
        REFERENCES clinics(clinic_id)
        ON DELETE CASCADE,

    requested_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    approved_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    urgency VARCHAR(30),

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    purpose TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    fulfilled_at TIMESTAMPTZ
);

-- ============================================================
-- PURCHASE REQUEST ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_request_items (
    request_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id UUID NOT NULL
        REFERENCES purchase_requests(request_id)
        ON DELETE CASCADE,

    item_id UUID NOT NULL
        REFERENCES inventory_items(item_id)
        ON DELETE RESTRICT,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0)
);

-- ============================================================
-- ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    clinic_id UUID
        REFERENCES clinics(clinic_id)
        ON DELETE CASCADE,

    item_id UUID
        REFERENCES inventory_items(item_id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    assigned_to UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    alert_type VARCHAR(50) NOT NULL,

    severity VARCHAR(30) NOT NULL DEFAULT 'medium',

    message TEXT NOT NULL,

    current_stock INTEGER,

    threshold INTEGER,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    resolved_at TIMESTAMPTZ,

    resolution_notes TEXT
);

-- ============================================================
-- DEMAND FORECASTS
-- ============================================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
    forecast_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES inventory_items(item_id)
        ON DELETE CASCADE,

    forecast_period VARCHAR(50),

    predicted_demand NUMERIC(12,2)
        NOT NULL DEFAULT 0,

    confidence_lower NUMERIC(12,2),

    confidence_upper NUMERIC(12,2),

    seasonality_factor NUMERIC(10,4),

    recommended_order_quantity NUMERIC(12,2),

    recommended_order_date DATE,

    model_version VARCHAR(100),

    forecast_date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    target_id UUID,

    target_table VARCHAR(100),

    details JSONB,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SYSTEM CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS system_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    clinic_id UUID UNIQUE
        REFERENCES clinics(clinic_id)
        ON DELETE CASCADE,

    reorder_point_default INTEGER NOT NULL DEFAULT 0,

    low_stock_threshold INTEGER NOT NULL DEFAULT 0,

    expiry_warning_days INTEGER NOT NULL DEFAULT 30,

    forecast_model VARCHAR(100),

    backup_schedule VARCHAR(100),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_clinic
ON users(clinic_id);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role_id);

CREATE INDEX IF NOT EXISTS idx_inventory_clinic
ON inventory_items(clinic_id);

CREATE INDEX IF NOT EXISTS idx_inventory_supplier
ON inventory_items(supplier_id);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_item
ON inventory_batches(item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry
ON inventory_batches(expiration_date);

CREATE INDEX IF NOT EXISTS idx_patients_clinic
ON patients(clinic_id);

CREATE INDEX IF NOT EXISTS idx_health_patient
ON health_records(patient_id);

CREATE INDEX IF NOT EXISTS idx_transactions_item
ON stock_transactions(item_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user
ON stock_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created
ON stock_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_requests_clinic
ON purchase_requests(clinic_id);

CREATE INDEX IF NOT EXISTS idx_alerts_clinic
ON alerts(clinic_id);

CREATE INDEX IF NOT EXISTS idx_alerts_status
ON alerts(status);

CREATE INDEX IF NOT EXISTS idx_forecasts_item
ON demand_forecasts(item_id);

CREATE INDEX IF NOT EXISTS idx_audit_user
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_created
ON audit_logs(created_at);