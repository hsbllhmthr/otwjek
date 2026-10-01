/**
 * Data Mitra Merchant OTWFood
 */
export const FOOD_CATEGORIES = [
  { id: 'all', label: 'Semua', icon: '🍽️' },
  { id: 'nasi', label: 'Nasi & Ayam', icon: '🍗' },
  { id: 'mie', label: 'Aneka Mie', icon: '🍜' },
  { id: 'minuman', label: 'Minuman & Kopi', icon: '🧋' },
  { id: 'snack', label: 'Cemilan & Martabak', icon: '🥟' }
];

export const FOOD_MERCHANTS = [
  {
    id: 'm-1',
    name: 'Ayam Geprek Juara Samata',
    category: 'nasi',
    rating: 4.8,
    reviewsCount: 340,
    eta: '15-25 min',
    distance: '1.2 km',
    banner: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
    promoBadge: 'Diskon 20%',
    verified: true,
    items: [
      {
        id: 'f-101',
        name: 'Paket Geprek Krispi Sambal Bawang',
        description: 'Ayam crispy geprek sambal bawang pedas nampol + Nasi putih pulen + Timun segar',
        price: 22000,
        img: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-102',
        name: 'Paket Geprek Leleh Mozarella',
        description: 'Ayam geprek berbalut keju mozarella bakar gurih + Nasi hangat',
        price: 27000,
        img: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-103',
        name: 'Kulit Ayam Crispy Gurih',
        description: 'Kulit ayam goreng tepung renyah gurih bumbu rempah pilihan',
        price: 12000,
        img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=300&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 'm-2',
    name: 'Coto Makassar & Konro Daeng Rewa',
    category: 'nasi',
    rating: 4.9,
    reviewsCount: 512,
    eta: '20-30 min',
    distance: '2.0 km',
    banner: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    promoBadge: 'Favorit',
    verified: true,
    items: [
      {
        id: 'f-201',
        name: 'Coto Makassar Daging Spesial',
        description: 'Kuah rempah kacang kental khas Makassar dengan daging sapi empuk + 2 Ketupat',
        price: 25000,
        img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-202',
        name: 'Konro Bakar Saus Kacang',
        description: 'Iga sapi bakar empuk bumbu rempah khas dengan siraman saus kacang gurih manis',
        price: 45000,
        img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-203',
        name: 'Es Pisang Ijo Khas Makassar',
        description: 'Pisang dibalut kulit pandan hijau lembut disiram bubur sumsum, sirup DHT & susu',
        price: 15000,
        img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 'm-3',
    name: 'Mie Pedas Nampol Level Up',
    category: 'mie',
    rating: 4.7,
    reviewsCount: 420,
    eta: '15-20 min',
    distance: '1.5 km',
    banner: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    promoBadge: 'Beli 2 Lebih Hemat',
    verified: true,
    items: [
      {
        id: 'f-301',
        name: 'Mie Pedas Gurih Level 1-5',
        description: 'Mie kenyal pedas gurih taburan ayam cincang halus, pangsit goreng & daun bawang',
        price: 15000,
        img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-302',
        name: 'Dimsum Udang Keju (3 pcs)',
        description: 'Dimsum balut keju leleh dengan isian udang padat gurih renyah',
        price: 14000,
        img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-303',
        name: 'Siomay Ayam Steam (4 pcs)',
        description: 'Siomay ayam kukus kenyal juicy disajikan hangat dengan saus asam manis',
        price: 13000,
        img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=300&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 'm-4',
    name: 'Kopi & Boba Mood Booster',
    category: 'minuman',
    rating: 4.8,
    reviewsCount: 280,
    eta: '10-20 min',
    distance: '0.9 km',
    banner: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    promoBadge: 'Paling Laris',
    verified: true,
    items: [
      {
        id: 'f-401',
        name: 'Kopi Susu Aren Mantap',
        description: 'Espresso double shot dipadu susu segar creamy dan sirup gula aren asli',
        price: 16000,
        img: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-402',
        name: 'Brown Sugar Fresh Milk Boba',
        description: 'Boba kenyal manis hangat dipadukan dengan fresh milk dingin segar',
        price: 18000,
        img: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-403',
        name: 'Matcha Latte Creamy',
        description: 'Matcha premium Jepang asli dengan susu creamy lembut',
        price: 19000,
        img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 'm-5',
    name: 'Martabak & Terang Bulan Istimewa',
    category: 'snack',
    rating: 4.9,
    reviewsCount: 390,
    eta: '20-30 min',
    distance: '1.8 km',
    banner: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    promoBadge: 'Spesial Malam',
    verified: true,
    items: [
      {
        id: 'f-501',
        name: 'Martabak Telur Daging Sapi Spesial',
        description: 'Kulit martabak renyah garing dengan isian 3 butir telur bebek dan daging sapi berbumbu',
        price: 35000,
        img: 'https://images.unsplash.com/photo-1606471191009-63994c53433b?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'f-502',
        name: 'Terang Bulan Coklat Keju Wijsman',
        description: 'Adonan bersarang lembut aroma butter wijsman dengan taburan coklat meses & keju parut melimpah',
        price: 32000,
        img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80'
      }
    ]
  }
];
