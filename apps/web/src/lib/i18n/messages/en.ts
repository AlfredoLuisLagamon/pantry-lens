export const en = {
  "language.label": "Language",

  "search.title": "Find packaged food products",
  "search.subtitle":
    "Search by product title or brand term. Results come from Open Food Facts through our API.",
  "search.label": "Search products",
  "search.placeholder": "Try Oreo, Nutella, or milk chocolate",
  "search.submit": "Search",
  "search.searching": "Searching…",
  "search.idleHint": "Enter a product name to begin.",
  "search.validation.minLength": "Enter at least 2 characters to search.",
  "search.resultsFor": "Results for “{query}”",
  "search.resultsTotal": " · {total} total",
  "search.emptyTitle": "No products found for “{query}”.",
  "search.emptyHint": "Try a different product name or search term.",
  "search.previous": "Previous",
  "search.next": "Next",
  "search.retry": "Retry",
  "search.upstreamError":
    "Product search is temporarily unavailable. Try again.",
  "search.genericError": "Something went wrong. Try again.",

  "product.unknownName": "Unknown product",
  "product.brandUnavailable": "Brand unavailable",

  "recent.title": "Recent searches",
  "recent.unavailable":
    "Recent searches unavailable (database not connected).",

  "detail.back": "← Back to search",
  "detail.barcode": "Barcode {barcode}",
  "detail.nutritionTitle": "Nutrition details",
  "detail.nutritionLocked":
    "Nutrition information is available with a subscription. No nutritional values are shown here until access is granted by the API.",
  "detail.notFound": "Product not found.",
  "detail.upstreamError":
    "Product details are temporarily unavailable. Try again.",
  "detail.retry": "Retry",
  "detail.genericError": "Something went wrong. Try again.",

  "nutrition.per100g": "Per 100 g",
  "nutrition.energy": "Energy",
  "nutrition.fat": "Fat",
  "nutrition.saturatedFat": "Saturated fat",
  "nutrition.carbohydrates": "Carbohydrates",
  "nutrition.sugars": "Sugars",
  "nutrition.fiber": "Fiber",
  "nutrition.protein": "Protein",
  "nutrition.salt": "Salt",
  "nutrition.unavailable": "Unavailable",

  "billing.subscribe": "Subscribe",
  "billing.subscribed": "Subscribed",
  "billing.price": "€4.99/month",
  "billing.redirecting": "Redirecting…",
  "billing.statusUnavailable": "Subscription status unavailable",
  "billing.checkoutFailed": "Unable to start checkout. Try again.",
  "billing.successTitle": "Checkout completed",
  "billing.successBody":
    "Your payment was submitted successfully. Subscription access is confirmed by our billing system.",
  "billing.cancelTitle": "Checkout canceled",
  "billing.cancelBody": "No changes were made to your subscription.",
  "billing.returnSearch": "Return to search",
  "billing.returnHome": "Return to Pantry Lens",

  "error.OFF_UPSTREAM":
    "Product search is temporarily unavailable. Try again.",
  "error.OFF_TIMEOUT":
    "Product search is temporarily unavailable. Try again.",
  "error.PRODUCT_NOT_FOUND": "Product not found.",
  "error.VALIDATION_ERROR": "Please check your search and try again.",
  "error.DATABASE_UNAVAILABLE":
    "Database unavailable. Try again later.",
  "error.DEMO_USER_MISSING":
    "Database unavailable. Try again later.",
  "error.ALREADY_SUBSCRIBED": "You already have an active subscription.",
  "error.STRIPE_CHECKOUT_FAILED": "Unable to start checkout. Try again.",
  "error.STRIPE_CONFIGURATION":
    "Subscription checkout is not configured yet.",
  "error.UNKNOWN_ERROR": "Something went wrong. Try again.",
} as const;

export type MessageKey = keyof typeof en;
