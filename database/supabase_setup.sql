-- ============================================================================
-- SUPABASE REALTIME SETUP: OTWJek (Customer, Driver, & Admin Live Sync)
-- ============================================================================
-- Jalankan seluruh skrip ini di:
--   Supabase Dashboard -> SQL Editor -> New query -> Paste -> Run
--
-- Aman dijalankan ulang (idempotent). Skrip ini membuat 4 tabel sinkronisasi
-- real-time agar order pelanggan, status driver, verifikasi berkas, dan
-- penugasan admin langsung sinkron antar-perangkat melalui Vercel.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabel Pengguna (Pelanggan, Mitra Driver, Admin)
CREATE TABLE IF NOT EXISTS public.otw_users (
    id TEXT PRIMARY KEY,
    phone TEXT NULL,
    email TEXT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'customer',
    status TEXT NOT NULL DEFAULT 'active',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otw_users_phone ON public.otw_users(phone);
CREATE INDEX IF NOT EXISTS idx_otw_users_role ON public.otw_users(role);
CREATE INDEX IF NOT EXISTS idx_otw_users_updated_at ON public.otw_users(updated_at DESC);

-- 2. Tabel Mitra Driver
CREATE TABLE IF NOT EXISTS public.otw_drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT NULL,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'motor',
    verification_status TEXT NOT NULL DEFAULT 'pending',
    is_online BOOLEAN NOT NULL DEFAULT false,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otw_drivers_user_id ON public.otw_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_otw_drivers_status ON public.otw_drivers(verification_status, is_online);
CREATE INDEX IF NOT EXISTS idx_otw_drivers_updated_at ON public.otw_drivers(updated_at DESC);

-- 3. Tabel Dokumen Driver (KTP, SIM, STNK)
CREATE TABLE IF NOT EXISTS public.otw_driver_documents (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otw_driver_docs_driver_id ON public.otw_driver_documents(driver_id);

-- 4. Tabel Pemesanan Perjalanan & Pengiriman Paket
CREATE TABLE IF NOT EXISTS public.otw_bookings (
    id TEXT PRIMARY KEY,
    order_code TEXT NULL,
    booking_code TEXT NULL,
    customer_id TEXT NULL,
    driver_id TEXT NULL,
    service_type TEXT NOT NULL DEFAULT 'motor',
    assignment_status TEXT NOT NULL DEFAULT 'unassigned',
    booking_status TEXT NOT NULL DEFAULT 'in_progress',
    driver_step TEXT NULL,
    fare_amount NUMERIC NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otw_bookings_created_at ON public.otw_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otw_bookings_status ON public.otw_bookings(booking_status, assignment_status);
CREATE INDEX IF NOT EXISTS idx_otw_bookings_customer_id ON public.otw_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_otw_bookings_driver_id ON public.otw_bookings(driver_id);

-- Trigger otomatis untuk updated_at
CREATE OR REPLACE FUNCTION public.otw_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_otw_users_updated_at ON public.otw_users;
CREATE TRIGGER trg_otw_users_updated_at
    BEFORE UPDATE ON public.otw_users
    FOR EACH ROW EXECUTE FUNCTION public.otw_touch_updated_at();

DROP TRIGGER IF EXISTS trg_otw_drivers_updated_at ON public.otw_drivers;
CREATE TRIGGER trg_otw_drivers_updated_at
    BEFORE UPDATE ON public.otw_drivers
    FOR EACH ROW EXECUTE FUNCTION public.otw_touch_updated_at();

DROP TRIGGER IF EXISTS trg_otw_driver_docs_updated_at ON public.otw_driver_documents;
CREATE TRIGGER trg_otw_driver_docs_updated_at
    BEFORE UPDATE ON public.otw_driver_documents
    FOR EACH ROW EXECUTE FUNCTION public.otw_touch_updated_at();

DROP TRIGGER IF EXISTS trg_otw_bookings_updated_at ON public.otw_bookings;
CREATE TRIGGER trg_otw_bookings_updated_at
    BEFORE UPDATE ON public.otw_bookings
    FOR EACH ROW EXECUTE FUNCTION public.otw_touch_updated_at();

-- Wajib agar event DELETE & UPDATE Supabase Realtime membawa data lama & baru lengkap
ALTER TABLE public.otw_users REPLICA IDENTITY FULL;
ALTER TABLE public.otw_drivers REPLICA IDENTITY FULL;
ALTER TABLE public.otw_driver_documents REPLICA IDENTITY FULL;
ALTER TABLE public.otw_bookings REPLICA IDENTITY FULL;

-- Daftarkan keempat tabel ke publikasi Supabase Realtime secara aman
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['otw_users', 'otw_drivers', 'otw_driver_documents', 'otw_bookings']
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END
$$;

-- Row Level Security (RLS)
-- Catatan keamanan: Aplikasi saat ini mengelola sesi login/tamu dari frontend.
-- Kebijakan di bawah mengizinkan klien (anon/authenticated) membaca & menulis tabel sinkronisasi.
-- Untuk produksi skala lanjut, migrasi autentikasi ke Supabase Auth dan perketat policy per-user/admin.
ALTER TABLE public.otw_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otw_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otw_driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otw_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otw_users_realtime_access" ON public.otw_users;
CREATE POLICY "otw_users_realtime_access"
    ON public.otw_users FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "otw_drivers_realtime_access" ON public.otw_drivers;
CREATE POLICY "otw_drivers_realtime_access"
    ON public.otw_drivers FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "otw_driver_docs_realtime_access" ON public.otw_driver_documents;
CREATE POLICY "otw_driver_docs_realtime_access"
    ON public.otw_driver_documents FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "otw_bookings_realtime_access" ON public.otw_bookings;
CREATE POLICY "otw_bookings_realtime_access"
    ON public.otw_bookings FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);
