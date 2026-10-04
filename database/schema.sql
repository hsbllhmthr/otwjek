-- ============================================================================
-- DATABASE SCHEMA: OTWJek (Aplikasi Transportasi & Layanan Khusus Wanita)
-- Engine: PostgreSQL 14+ / Supabase / Compatible with MySQL 8.0+
-- Deskripsi: Skema database relasional lengkap untuk mengelola Pengguna, 
--            Mitra Driver Wanita, Verifikasi Dokumen (KTP, SIM, STNK),
--            Pemesanan Perjalanan (SheRide/SheCar), Pengiriman Paket (SheSend),
--            Kuliner (OTWFood), Transaksi Pembayaran, dan Dispatch WhatsApp.
-- ============================================================================

-- Aktifkan ekstensi UUID untuk identifier yang unik dan aman
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABEL PENGGUNA (USERS)
-- Menyimpan data akun semua pengguna (Pelanggan, Driver, Admin, Merchant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(25) UNIQUE NOT NULL, -- Format internasional e.g. +6281234567890
    password_hash VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL DEFAULT 'Perempuan' CHECK (gender IN ('Perempuan')),
    birth_date DATE NULL,
    avatar_url TEXT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'driver', 'admin', 'merchant')),
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification', 'inactive')),
    last_login_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 2. TABEL MITRA PENGEMUDI (DRIVERS)
-- Menyimpan profil khusus mitra driver wanita, data kendaraan, rating, & koordinat
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('motor', 'mobil')),
    vehicle_brand VARCHAR(50) NOT NULL, -- e.g. Honda, Yamaha, Toyota
    vehicle_model VARCHAR(100) NOT NULL, -- e.g. Scoopy Matte Pink, Calya Putih
    plate_number VARCHAR(25) NOT NULL UNIQUE, -- e.g. DD 4128 SR
    vehicle_color VARCHAR(50) NOT NULL,
    nik VARCHAR(16) NULL, -- NIK KTP Pengemudi (16 digit angka)
    sim_number VARCHAR(50) NULL, -- Nomor SIM C / SIM A
    sim_expiry DATE NULL, -- Masa berlaku SIM
    stnk_expiry DATE NULL, -- Masa berlaku pajak STNK tahunan
    emergency_contact_name VARCHAR(100) NULL,
    emergency_contact_phone VARCHAR(25) NULL,
    rating DECIMAL(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
    trips_count INT NOT NULL DEFAULT 0,
    operational_area TEXT NOT NULL, -- e.g. Makassar (Tamalate & Rappocini) - Gowa
    bio TEXT NULL,
    badge VARCHAR(100) NULL, -- e.g. Mitra Teladan 🌸, Favorite Mahasiswi 🎓
    current_latitude DECIMAL(10, 8) NULL,
    current_longitude DECIMAL(11, 8) NULL,
    last_location_updated_at TIMESTAMP WITH TIME ZONE NULL,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (availability_status IN ('available', 'busy', 'on_trip', 'offline')),
    verification_status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'approved', 'rejected')),
    rejection_reason TEXT NULL, -- Catatan penolakan jika verifikasi ditolak admin
    reviewed_by VARCHAR(100) NULL,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_vehicle_type ON drivers(vehicle_type);
CREATE INDEX idx_drivers_availability ON drivers(is_online, availability_status);
CREATE INDEX idx_drivers_location ON drivers(current_latitude, current_longitude);

-- ============================================================================
-- 3. TABEL DOKUMEN MITRA DRIVER (DRIVER_DOCUMENTS)
-- Menyimpan file unggahan KTP, SIM, STNK untuk syarat wajib verifikasi driver
-- ============================================================================
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('ktp', 'sim', 'stnk', 'skck')),
    document_url TEXT NOT NULL,
    file_name VARCHAR(255) NULL,
    file_size_kb INT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT NULL,
    reviewed_by UUID NULL REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (driver_id, document_type)
);

CREATE INDEX idx_driver_docs_driver_id ON driver_documents(driver_id);
CREATE INDEX idx_driver_docs_type ON driver_documents(document_type);
CREATE INDEX idx_driver_docs_status ON driver_documents(verification_status);

-- ============================================================================
-- 4. TABEL OPERATOR ADMIN DISPATCH (ADMINS)
-- Gateway WhatsApp multi-admin untuk dispatch order & monitoring operasional
-- ============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    admin_code VARCHAR(30) NOT NULL UNIQUE, -- e.g. admin-1, admin-2
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'dispatch_utama' CHECK (role IN ('dispatch_utama', 'dispatch_pendamping', 'area_barat', 'area_timur', 'superadmin')),
    whatsapp_number VARCHAR(25) NOT NULL, -- Format internasional e.g. 62882021942470
    is_online BOOLEAN NOT NULL DEFAULT TRUE,
    response_eta_text VARCHAR(50) NOT NULL DEFAULT 'Respon ~1 Menit',
    active_chats_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_code ON admins(admin_code);
CREATE INDEX idx_admins_is_online ON admins(is_online);

-- ============================================================================
-- 5. TABEL PEMESANAN PERJALANAN (RIDE_BOOKINGS)
-- Menyimpan order layanan SheRide (Motor) dan SheCar (Mobil)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(35) NOT NULL UNIQUE, -- e.g. RIDE-20261004-001
    customer_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID NULL REFERENCES drivers(id),
    assigned_admin_id UUID NULL REFERENCES admins(id),
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('motor', 'mobil')),
    service_tier VARCHAR(30) NOT NULL DEFAULT 'protect', -- e.g. protect, regular, car-protect
    
    -- Titik Penjemputan
    pickup_name VARCHAR(255) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    
    -- Titik Tujuan
    dropoff_name VARCHAR(255) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10, 8) NOT NULL,
    dropoff_longitude DECIMAL(11, 8) NOT NULL,
    
    -- Jarak, Durasi & Tarif
    distance_km DECIMAL(6, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    base_fare DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_fare DECIMAL(12, 2) NOT NULL,
    
    -- Pembayaran & Status
    payment_method VARCHAR(25) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qris', 'wallet')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    booking_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        booking_status IN ('pending', 'searching_driver', 'driver_assigned', 'driver_on_way', 'driver_arrived', 'in_trip', 'completed', 'cancelled')
    ),
    
    passenger_notes TEXT NULL,
    whatsapp_dispatch_link TEXT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NULL, -- NULL jika sekarang (mode 'now')
    started_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rides_customer_id ON ride_bookings(customer_id);
CREATE INDEX idx_rides_driver_id ON ride_bookings(driver_id);
CREATE INDEX idx_rides_status ON ride_bookings(booking_status);
CREATE INDEX idx_rides_code ON ride_bookings(booking_code);
CREATE INDEX idx_rides_created_at ON ride_bookings(created_at);

-- ============================================================================
-- 6. TABEL PENGIRIMAN PAKET (PACKAGE_DELIVERIES)
-- Menyimpan order layanan SheSend (Pengiriman barang/dokumen)
-- ============================================================================
CREATE TABLE IF NOT EXISTS package_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_code VARCHAR(35) NOT NULL UNIQUE, -- e.g. SEND-20261004-001
    customer_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID NULL REFERENCES drivers(id),
    assigned_admin_id UUID NULL REFERENCES admins(id),
    
    -- Data Pengirim
    sender_name VARCHAR(120) NOT NULL,
    sender_phone VARCHAR(25) NOT NULL,
    sender_address TEXT NOT NULL,
    sender_latitude DECIMAL(10, 8) NOT NULL,
    sender_longitude DECIMAL(11, 8) NOT NULL,
    
    -- Data Penerima
    receiver_name VARCHAR(120) NOT NULL,
    receiver_phone VARCHAR(25) NOT NULL,
    receiver_address TEXT NOT NULL,
    receiver_latitude DECIMAL(10, 8) NOT NULL,
    receiver_longitude DECIMAL(11, 8) NOT NULL,
    
    -- Spesifikasi Paket
    package_category VARCHAR(50) NOT NULL CHECK (package_category IN ('dokumen', 'makanan', 'pakaian', 'elektronik', 'kue', 'lainnya')),
    package_description TEXT NOT NULL,
    weight_kg DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    is_fragile BOOLEAN NOT NULL DEFAULT FALSE,
    handling_instructions TEXT NULL,
    
    -- Keuangan
    distance_km DECIMAL(6, 2) NOT NULL,
    delivery_fee DECIMAL(12, 2) NOT NULL,
    insurance_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_fare DECIMAL(12, 2) NOT NULL,
    
    payment_method VARCHAR(25) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qris')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        delivery_status IN ('pending', 'driver_assigned', 'heading_to_sender', 'picked_up', 'in_transit', 'delivered', 'cancelled')
    ),
    
    pickup_photo_url TEXT NULL,
    proof_of_delivery_url TEXT NULL, -- Foto bukti penerimaan barang
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliveries_customer ON package_deliveries(customer_id);
CREATE INDEX idx_deliveries_driver ON package_deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON package_deliveries(delivery_status);

-- ============================================================================
-- 7. TABEL MITRA KULINER (FOOD_MERCHANTS)
-- Menyimpan restoran & gerai mitra OTWFood
-- ============================================================================
CREATE TABLE IF NOT EXISTS food_merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g. nasi, mie, minuman, snack
    phone VARCHAR(25) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    rating DECIMAL(3, 2) NOT NULL DEFAULT 4.80 CHECK (rating >= 1.00 AND rating <= 5.00),
    reviews_count INT NOT NULL DEFAULT 0,
    banner_url TEXT NULL,
    promo_badge VARCHAR(50) NULL, -- e.g. Diskon 20%, Favorit
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    eta_range VARCHAR(30) NOT NULL DEFAULT '15-25 min',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_merchants_category ON food_merchants(category);
CREATE INDEX idx_merchants_open ON food_merchants(is_open);

-- ============================================================================
-- 8. TABEL MENU KULINER (MENU_ITEMS)
-- Daftar makanan dan minuman dari setiap mitra kuliner
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES food_merchants(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    price DECIMAL(12, 2) NOT NULL,
    image_url TEXT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    category VARCHAR(50) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_merchant ON menu_items(merchant_id);
CREATE INDEX idx_menu_available ON menu_items(is_available);

-- ============================================================================
-- 9. TABEL PESANAN KULINER (FOOD_ORDERS)
-- Transaksi pemesanan makanan oleh pengguna
-- ============================================================================
CREATE TABLE IF NOT EXISTS food_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(35) NOT NULL UNIQUE, -- e.g. FOOD-20261004-001
    customer_id UUID NOT NULL REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES food_merchants(id),
    driver_id UUID NULL REFERENCES drivers(id),
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8) NOT NULL,
    delivery_longitude DECIMAL(11, 8) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    delivery_fee DECIMAL(12, 2) NOT NULL,
    service_fee DECIMAL(12, 2) NOT NULL DEFAULT 2000,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(25) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qris')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    order_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        order_status IN ('pending', 'confirmed_by_merchant', 'cooking', 'driver_pickup', 'on_delivery', 'completed', 'cancelled')
    ),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    notes VARCHAR(255) NULL
);

-- ============================================================================
-- 10. TABEL TRANSAKSI & PEMBAYARAN (TRANSACTIONS)
-- Pencatatan ledger pembayaran resmi (QRIS, Tunai, e-Wallet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. INV-OTW-20261004-0001
    user_id UUID NOT NULL REFERENCES users(id),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('ride', 'delivery', 'food')),
    order_id UUID NOT NULL,
    payment_channel VARCHAR(25) NOT NULL CHECK (payment_channel IN ('cash', 'qris', 'bank_transfer', 'wallet')),
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'expired')),
    qris_qr_data TEXT NULL,
    paid_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trans_user ON transactions(user_id);
CREATE INDEX idx_trans_invoice ON transactions(invoice_number);
CREATE INDEX idx_trans_order ON transactions(order_type, order_id);

-- ============================================================================
-- 11. TABEL ULASAN & RATING (RATINGS_AND_REVIEWS)
-- Ulasan dari penumpang untuk driver wanita OTWJek
-- ============================================================================
CREATE TABLE IF NOT EXISTS ratings_and_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('ride', 'delivery')),
    order_id UUID NOT NULL,
    rating_score SMALLINT NOT NULL CHECK (rating_score BETWEEN 1 AND 5),
    review_text TEXT NULL,
    positive_tags TEXT[] NULL, -- e.g. ARRAY['Helm Harum', 'Santun', 'Tepat Waktu']
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_driver ON ratings_and_reviews(driver_id);
CREATE INDEX idx_reviews_score ON ratings_and_reviews(rating_score);

-- ============================================================================
-- 12. TABEL LOKASI TERSIMPAN / FAVORIT (USER_SAVED_LOCATIONS)
-- Alamat tersimpan pengguna (Rumah, Kantor, Kampus, dsb.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_saved_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL, -- e.g. Rumah, Kantor, Kampus, Kos
    address_name VARCHAR(255) NOT NULL,
    full_address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_loc_user ON user_saved_locations(user_id);

-- ============================================================================
-- TRIGGER OTOMATIS: Update kolom updated_at setiap ada perubahan baris
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_driver_documents_updated_at BEFORE UPDATE ON driver_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ride_bookings_updated_at BEFORE UPDATE ON ride_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_package_deliveries_updated_at BEFORE UPDATE ON package_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_food_merchants_updated_at BEFORE UPDATE ON food_merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_food_orders_updated_at BEFORE UPDATE ON food_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
