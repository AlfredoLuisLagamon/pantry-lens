process.env.DATABASE_URL ??=
  "mysql://pantry:pantry@127.0.0.1:3306/pantry_lens";
process.env.DEMO_USER_EMAIL ??= "demo@pantry-lens.local";
process.env.CORS_ORIGIN ??= "http://localhost:3000";
process.env.PORT ??= "4000";
process.env.OPEN_FOOD_FACTS_BASE_URL ??= "https://world.openfoodfacts.org";
process.env.OPEN_FOOD_FACTS_USER_AGENT ??=
  "PantryLens/1.0 (demo@pantry-lens.local)";
process.env.NODE_ENV = "test";
