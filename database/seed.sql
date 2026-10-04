-- ============================================================================
-- SEED DATA: OTWJek Database
-- Mengisi data awal untuk Admin Dispatch, Mitra Driver Perempuan Terverifikasi,
-- Contoh Pengguna, Mitra Kuliner OTWFood, dan Alamat Populer
-- ============================================================================

-- 1. SEED PENGGUNA (USERS)
-- Buat akun untuk admin, driver, dan contoh pelanggan
INSERT INTO users (id, full_name, email, phone, password_hash, gender, role, is_phone_verified, status)
VALUES
    -- Admin Accounts
    ('a0000000-0000-0000-0000-000000000001', 'Admin Dispatch 1', 'admin1@otwjek.id', '+62882021942470', '$2b$10$hashedadminpwd1', 'Perempuan', 'admin', TRUE, 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'Admin Dispatch 2', 'admin2@otwjek.id', '+6281354613984', '$2b$10$hashedadminpwd2', 'Perempuan', 'admin', TRUE, 'active'),
    ('a0000000-0000-0000-0000-000000000003', 'Admin Area Barat', 'admin3@otwjek.id', '+6282345614803', '$2b$10$hashedadminpwd3', 'Perempuan', 'admin', TRUE, 'active'),
    ('a0000000-0000-0000-0000-000000000004', 'Admin Area Timur', 'admin4@otwjek.id', '+6281545629713', '$2b$10$hashedadminpwd4', 'Perempuan', 'admin', TRUE, 'active'),

    -- Verified Female Drivers
    ('d0000000-0000-0000-0000-000000000001', 'Siti Rahmawati', 'siti.rahmawati@gmail.com', '+6281241280001', '$2b$10$hasheddriverpwd1', 'Perempuan', 'driver', TRUE, 'active'),
    ('d0000000-0000-0000-0000-000000000002', 'Rina Anggraeni', 'rina.anggraeni@gmail.com', '+6281238920002', '$2b$10$hasheddriverpwd2', 'Perempuan', 'driver', TRUE, 'active'),
    ('d0000000-0000-0000-0000-000000000003', 'Dewi Lestari', 'dewi.lestari@gmail.com', '+6281222090003', '$2b$10$hasheddriverpwd3', 'Perempuan', 'driver', TRUE, 'active'),
    ('d0000000-0000-0000-0000-000000000004', 'Nurul Aini', 'nurul.aini@gmail.com', '+6281267100004', '$2b$10$hasheddriverpwd4', 'Perempuan', 'driver', TRUE, 'active'),

    -- Contoh Pelanggan (Customer)
    ('c0000000-0000-0000-0000-000000000001', 'Fathimah Azzahra', 'fathimah@gmail.com', '+6281355001122', '$2b$10$hashedcustomerpwd1', 'Perempuan', 'customer', TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED ADMIN DISPATCH GATEWAY (ADMINS)
INSERT INTO admins (id, user_id, admin_code, display_name, role, whatsapp_number, is_online, response_eta_text)
VALUES
    ('ad000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin-1', 'Admin 1 (Dispatch Utama)', 'dispatch_utama', '62882021942470', TRUE, 'Respon ~1 Menit'),
    ('ad000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'admin-2', 'Admin 2 (Dispatch Pendamping)', 'dispatch_pendamping', '6281354613984', TRUE, 'Respon ~2 Menit'),
    ('ad000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'admin-3', 'Admin 3 (Dispatch Area Barat)', 'area_barat', '6282345614803', TRUE, 'Online'),
    ('ad000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'admin-4', 'Admin 4 (Dispatch Area Timur)', 'area_timur', '6281545629713', TRUE, 'Online')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED MITRA PENGEMUDI (DRIVERS)
INSERT INTO drivers (
    id, user_id, vehicle_type, vehicle_brand, vehicle_model, plate_number, vehicle_color,
    rating, trips_count, operational_area, bio, badge, current_latitude, current_longitude,
    is_online, availability_status, verification_status, verified_at
)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
        'motor', 'Honda', 'Scoopy Matte Pink', 'DD 4128 SR', 'Matte Pink',
        4.96, 420, 'Makassar (Tamalate & Rappocini) - Gowa',
        'Mengemudi santun, helm harum & steril, selalu sedia penutup kepala gratis.',
        'Mitra Teladan 🌸', -5.1830, 119.4205, TRUE, 'available', 'approved', CURRENT_TIMESTAMP
    ),
    (
        'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
        'motor', 'Yamaha', 'Fazzio Pastel Mint', 'DD 3892 LF', 'Pastel Mint',
        4.92, 315, 'Pettarani - Panakkukang - Hertasning',
        'Ramah dan paham rute bebas macet. Sedia jas hujan wanita 2 pasang.',
        'Favorite Pelajar & Mahasiswi 🎓', -5.1765, 119.4280, TRUE, 'available', 'approved', CURRENT_TIMESTAMP
    ),
    (
        'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
        'mobil', 'Toyota', 'Calya Putih Mutiara (AC Dingin)', 'DD 2209 KR', 'Putih Mutiara',
        4.98, 560, 'Makassar - Gowa - Maros (Bandara UPG)',
        'Kabin mobil wangi aromaterapi lavender, bebas rokok, aman untuk ibu & anak.',
        'SheCar Driver of the Month 🏆', -5.1890, 119.4250, TRUE, 'available', 'approved', CURRENT_TIMESTAMP
    ),
    (
        'b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004',
        'motor', 'Honda', 'Vario 160 Pearl White', 'DD 6710 PQ', 'Pearl White',
        4.89, 198, 'Somba Opu - Sungguminasa - Samata (Gowa)',
        'Spesialis kirim dokumen penting & pesanan kue SheSend. Hati-hati dan tepat waktu.',
        'SheSend Express Kurir 📦', -5.1950, 119.4420, TRUE, 'available', 'approved', CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- 4. SEED DOKUMEN DRIVER (DRIVER_DOCUMENTS)
INSERT INTO driver_documents (driver_id, document_type, document_url, file_name, verification_status, reviewed_at)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'ktp', 'https://storage.otwjek.id/docs/ktp_siti.jpg', 'ktp_siti.jpg', 'approved', CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000001', 'sim', 'https://storage.otwjek.id/docs/sim_siti.jpg', 'sim_c_siti.jpg', 'approved', CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000001', 'stnk', 'https://storage.otwjek.id/docs/stnk_siti.jpg', 'stnk_scoopy_siti.jpg', 'approved', CURRENT_TIMESTAMP),

    ('b0000000-0000-0000-0000-000000000002', 'ktp', 'https://storage.otwjek.id/docs/ktp_rina.jpg', 'ktp_rina.jpg', 'approved', CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000002', 'sim', 'https://storage.otwjek.id/docs/sim_rina.jpg', 'sim_c_rina.jpg', 'approved', CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000002', 'stnk', 'https://storage.otwjek.id/docs/stnk_rina.jpg', 'stnk_fazzio_rina.jpg', 'approved', CURRENT_TIMESTAMP),

    ('b0000000-0000-0000-0000-000000000003', 'ktp', 'https://storage.otwjek.id/docs/ktp_dewi.jpg', 'ktp_dewi.jpg', 'approved', CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000003', 'sim', 'https://storage.otwjek.id/docs/sim_dewi.jpg', 'sim_a_dewi.jpg', 'approved', CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000003', 'stnk', 'https://storage.otwjek.id/docs/stnk_dewi.jpg', 'stnk_calya_dewi.jpg', 'approved', CURRENT_TIMESTAMP)
ON CONFLICT (driver_id, document_type) DO NOTHING;

-- 5. SEED MITRA KULINER (FOOD_MERCHANTS)
INSERT INTO food_merchants (id, merchant_name, category, phone, address, latitude, longitude, rating, reviews_count, promo_badge)
VALUES
    ('m0000000-0000-0000-0000-000000000001', 'Ayam Geprek Juara Samata', 'nasi', '+6281234567891', 'Jl. H. M. Yasin Limpo No. 45, Samata, Gowa', -5.2012, 119.4932, 4.80, 340, 'Diskon 20%'),
    ('m0000000-0000-0000-0000-000000000002', 'Coto Makassar & Konro Daeng Rewa', 'nasi', '+6281234567892', 'Jl. Sultan Alauddin No. 120, Makassar', -5.1840, 119.4290, 4.90, 512, 'Favorit'),
    ('m0000000-0000-0000-0000-000000000003', 'Kopi Kenangan Manis Pettarani', 'minuman', '+6281234567893', 'Jl. A. P. Pettarani No. 88, Makassar', -5.1580, 119.4360, 4.75, 290, 'Flash Sale')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED MENU KULINER (MENU_ITEMS)
INSERT INTO menu_items (merchant_id, item_name, description, price, is_available, category)
VALUES
    ('m0000000-0000-0000-0000-000000000001', 'Paket Geprek Krispi Sambal Bawang', 'Ayam crispy geprek sambal bawang pedas nampol + Nasi putih pulen + Timun segar', 22000, TRUE, 'Makanan Utama'),
    ('m0000000-0000-0000-0000-000000000001', 'Paket Geprek Leleh Mozarella', 'Ayam geprek berbalut keju mozarella bakar gurih + Nasi hangat', 27000, TRUE, 'Makanan Utama'),
    ('m0000000-0000-0000-0000-000000000001', 'Kulit Ayam Crispy Gurih', 'Kulit ayam goreng tepung renyah gurih bumbu rempah pilihan', 12000, TRUE, 'Cemilan'),
    ('m0000000-0000-0000-0000-000000000002', 'Coto Daging Sapi Spesial + Ketupat (2 pcs)', 'Coto Makassar kuah rempah kental gurih, daging sapi empuk', 35000, TRUE, 'Makanan Utama'),
    ('m0000000-0000-0000-0000-000000000003', 'Es Kopi Susu Gula Aren SheCare', 'Kopi espresso robusta pilihan dengan susu creamy dan sirup aren asli', 18000, TRUE, 'Minuman');

-- 7. SEED ALAMAT TERSIMPAN PENGGUNA (USER_SAVED_LOCATIONS)
INSERT INTO user_saved_locations (user_id, label, address_name, full_address, latitude, longitude)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Rumah', 'Kos Muslimah Cantika', 'Jl. Tamalate 3 No. 14, Makassar', -5.1835, 119.4210),
    ('c0000000-0000-0000-0000-000000000001', 'Kampus', 'Kampus UIN Alauddin Samata', 'Gedung Rektorat UIN Samata Gowa', -5.2045, 119.4950),
    ('c0000000-0000-0000-0000-000000000001', 'Belanja', 'Mal Panakkukang', 'Jl. Boulevard, Panakkukang, Makassar', -5.1578, 119.4475);
