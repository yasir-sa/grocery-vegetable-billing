// Sample items so the app can be tried at once. Prices are APPROXIMATE Chennai retail rates —
// the shopkeeper should edit them to the real prices. Photos: public/sample (Public Domain / CC0,
// see public/sample/CREDITS.md). `emoji` is shown when an item has no photo.
//   price + priceQty = "₹price for priceQty grams / ml / pieces"

export const SAMPLE_ITEMS = [
  // ---------- Vegetables (காய்கறி) ----------
  { key: 'tomato', shop: 'vegetable', nameEn: 'Tomato', nameTa: 'தக்காளி', unitType: 'weight', price: 40, priceQty: 1000, emoji: '🍅' },
  { key: 'onion', shop: 'vegetable', nameEn: 'Onion', nameTa: 'வெங்காயம்', unitType: 'weight', price: 45, priceQty: 1000, emoji: '🧅' },
  { key: 'potato', shop: 'vegetable', nameEn: 'Potato', nameTa: 'உருளைக்கிழங்கு', unitType: 'weight', price: 40, priceQty: 1000, emoji: '🥔' },
  { key: 'carrot', shop: 'vegetable', nameEn: 'Carrot', nameTa: 'கேரட்', unitType: 'weight', price: 60, priceQty: 1000, emoji: '🥕' },
  { key: 'beans', shop: 'vegetable', nameEn: 'Beans', nameTa: 'பீன்ஸ்', unitType: 'weight', price: 80, priceQty: 1000, emoji: '🫛' },
  { key: 'brinjal', shop: 'vegetable', nameEn: 'Brinjal', nameTa: 'கத்தரிக்காய்', unitType: 'weight', price: 50, priceQty: 1000, emoji: '🍆' },
  { key: 'ladysfinger', shop: 'vegetable', nameEn: "Lady's finger", nameTa: 'வெண்டைக்காய்', unitType: 'weight', price: 50, priceQty: 1000, emoji: '🫑' },
  { key: 'greenchilli', shop: 'vegetable', nameEn: 'Green chilli', nameTa: 'பச்சை மிளகாய்', unitType: 'weight', price: 20, priceQty: 250, emoji: '🌶️' },
  { key: 'ginger', shop: 'vegetable', nameEn: 'Ginger', nameTa: 'இஞ்சி', unitType: 'weight', price: 30, priceQty: 250, emoji: '🫚' },
  { key: 'garlic', shop: 'vegetable', nameEn: 'Garlic', nameTa: 'பூண்டு', unitType: 'weight', price: 60, priceQty: 250, emoji: '🧄' },
  { key: 'cabbage', shop: 'vegetable', nameEn: 'Cabbage', nameTa: 'முட்டைகோஸ்', unitType: 'weight', price: 35, priceQty: 1000, emoji: '🥬' },
  { key: 'cucumber', shop: 'vegetable', nameEn: 'Cucumber', nameTa: 'வெள்ளரிக்காய்', unitType: 'weight', price: 40, priceQty: 1000, emoji: '🥒' },
  { key: 'coconut', shop: 'vegetable', nameEn: 'Coconut', nameTa: 'தேங்காய்', unitType: 'count', price: 30, priceQty: 1, emoji: '🥥' },
  { key: 'lemon', shop: 'vegetable', nameEn: 'Lemon', nameTa: 'எலுமிச்சை', unitType: 'count', price: 5, priceQty: 1, emoji: '🍋' },
  { key: 'coriander', shop: 'vegetable', nameEn: 'Coriander leaves (bunch)', nameTa: 'கொத்தமல்லி (கட்டு)', unitType: 'count', price: 10, priceQty: 1, emoji: '🌿' },
  { key: 'banana', shop: 'vegetable', nameEn: 'Banana', nameTa: 'வாழைப்பழம்', unitType: 'count', price: 6, priceQty: 1, emoji: '🍌' },

  // ---------- Grocery (மளிகை) — பருப்பு வகைகள் and more ----------
  { key: 'toordal', shop: 'grocery', nameEn: 'Toor dal', nameTa: 'துவரம் பருப்பு', unitType: 'weight', price: 160, priceQty: 1000, emoji: '🫘' },
  { key: 'moongdal', shop: 'grocery', nameEn: 'Moong dal', nameTa: 'பாசிப் பருப்பு', unitType: 'weight', price: 130, priceQty: 1000, emoji: '🫘' },
  { key: 'uraddal', shop: 'grocery', nameEn: 'Urad dal', nameTa: 'உளுத்தம் பருப்பு', unitType: 'weight', price: 140, priceQty: 1000, emoji: '🫘' },
  { key: 'chanadal', shop: 'grocery', nameEn: 'Chana dal', nameTa: 'கடலைப் பருப்பு', unitType: 'weight', price: 100, priceQty: 1000, emoji: '🫘' },
  { key: 'rice', shop: 'grocery', nameEn: 'Ponni rice', nameTa: 'பொன்னி அரிசி', unitType: 'weight', price: 60, priceQty: 1000, emoji: '🍚' },
  { key: 'sugar', shop: 'grocery', nameEn: 'Sugar', nameTa: 'சர்க்கரை', unitType: 'weight', price: 45, priceQty: 1000, emoji: '🧂' },
  { key: 'salt', shop: 'grocery', nameEn: 'Salt', nameTa: 'உப்பு', unitType: 'weight', price: 25, priceQty: 1000, emoji: '🧂' },
  { key: 'atta', shop: 'grocery', nameEn: 'Wheat flour (atta)', nameTa: 'கோதுமை மாவு', unitType: 'weight', price: 50, priceQty: 1000, emoji: '🌾' },
  { key: 'sunfloweroil', shop: 'grocery', nameEn: 'Sunflower oil', nameTa: 'சூரியகாந்தி எண்ணெய்', unitType: 'volume', price: 150, priceQty: 1000, emoji: '🛢️' },
  { key: 'gingellyoil', shop: 'grocery', nameEn: 'Gingelly oil', nameTa: 'நல்லெண்ணெய்', unitType: 'volume', price: 180, priceQty: 500, emoji: '🫗' },
  { key: 'tea', shop: 'grocery', nameEn: 'Tea powder', nameTa: 'டீ தூள்', unitType: 'weight', price: 120, priceQty: 250, emoji: '🍵' },
  { key: 'milk', shop: 'grocery', nameEn: 'Milk', nameTa: 'பால்', unitType: 'volume', price: 30, priceQty: 500, emoji: '🥛' },
  { key: 'eggs', shop: 'grocery', nameEn: 'Egg', nameTa: 'முட்டை', unitType: 'count', price: 6, priceQty: 1, emoji: '🥚' },
  { key: 'mustard', shop: 'grocery', nameEn: 'Mustard seeds', nameTa: 'கடுகு', unitType: 'weight', price: 15, priceQty: 100, emoji: '🟤' },
  { key: 'turmeric', shop: 'grocery', nameEn: 'Turmeric powder', nameTa: 'மஞ்சள் தூள்', unitType: 'weight', price: 30, priceQty: 100, emoji: '🟡' },
  { key: 'chillipowder', shop: 'grocery', nameEn: 'Chilli powder', nameTa: 'மிளகாய் தூள்', unitType: 'weight', price: 35, priceQty: 100, emoji: '🌶️' },
]

const HAS_PHOTO = new Set(['tomato', 'onion', 'potato', 'carrot', 'beans', 'brinjal', 'ladysfinger', 'greenchilli', 'ginger',
  'garlic', 'cabbage', 'cucumber', 'coconut', 'coriander', 'banana', 'toordal', 'uraddal', 'chanadal', 'rice', 'sugar',
  'salt', 'atta', 'sunfloweroil', 'gingellyoil', 'tea', 'milk', 'eggs', 'mustard', 'turmeric', 'chillipowder'])

export const samplePhotoUrl = (key) => (HAS_PHOTO.has(key) ? `./sample/${key}.jpg` : null)
