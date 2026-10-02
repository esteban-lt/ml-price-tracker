export interface MercadoLibreCategory {
  slug: string;
  name: string;
  id: string;
}

export const MERCADO_LIBRE_CATEGORIES: readonly MercadoLibreCategory[] = [
  { slug: 'vehicle-accessories', name: 'Accesorios para Vehículos', id: 'MLM1747' },
  { slug: 'agriculture', name: 'Agro', id: 'MLM189530' },
  { slug: 'food-and-drinks', name: 'Alimentos y Bebidas', id: 'MLM1403' },
  { slug: 'pets', name: 'Animales y Mascotas', id: 'MLM1071' },
  { slug: 'antiques-and-collectibles', name: 'Antigüedades y Colecciones', id: 'MLM1367' },
  { slug: 'art-and-stationery', name: 'Arte, Papelería y Mercería', id: 'MLM1368' },
  { slug: 'baby', name: 'Bebés', id: 'MLM1384' },
  { slug: 'beauty-and-personal-care', name: 'Belleza y Cuidado Personal', id: 'MLM1246' },
  { slug: 'cameras', name: 'Cámaras y Accesorios', id: 'MLM1039' },
  { slug: 'phones', name: 'Celulares y Telefonía', id: 'MLM1051' },
  { slug: 'computers', name: 'Computación', id: 'MLM1648' },
  { slug: 'video-games', name: 'Consolas y Videojuegos', id: 'MLM1144' },
  { slug: 'construction', name: 'Construcción', id: 'MLM1500' },
  { slug: 'sports-and-fitness', name: 'Deportes y Fitness', id: 'MLM1276' },
  { slug: 'appliances', name: 'Electrodomésticos', id: 'MLM1575' },
  { slug: 'electronics', name: 'Electrónica, Audio y Video', id: 'MLM1000' },
  { slug: 'tools', name: 'Herramientas', id: 'MLM186863' },
  { slug: 'home-and-garden', name: 'Hogar, Muebles y Jardín', id: 'MLM1574' },
  { slug: 'industry-and-office', name: 'Industrias y Oficinas', id: 'MLM1499' },
  { slug: 'musical-instruments', name: 'Instrumentos Musicales', id: 'MLM1182' },
  { slug: 'jewelry-and-watches', name: 'Joyas y Relojes', id: 'MLM3937' },
  { slug: 'toys-and-games', name: 'Juegos y Juguetes', id: 'MLM1132' },
  { slug: 'books', name: 'Libros, Revistas y Comics', id: 'MLM3025' },
  { slug: 'music-and-movies', name: 'Música, Películas y Series', id: 'MLM1168' },
  { slug: 'party-supplies', name: 'Recuerdos, Cotillón y Fiestas', id: 'MLM44011' },
  { slug: 'clothing', name: 'Ropa, Bolsas y Calzado', id: 'MLM1430' },
  { slug: 'health', name: 'Salud y Equipamiento Médico', id: 'MLM187772' },
  { slug: 'other', name: 'Otras Categorías', id: 'MLM1953' },
];

export function findMercadoLibreCategory(slug: string): MercadoLibreCategory | undefined {
  return MERCADO_LIBRE_CATEGORIES.find((category) => category.slug === slug);
}
