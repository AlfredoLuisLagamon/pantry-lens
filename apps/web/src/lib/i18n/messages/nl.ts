import type { MessageKey } from "./en";

export const nl: Record<MessageKey, string> = {
  "language.label": "Taal",

  "search.title": "Zoek verpakte voedingsproducten",
  "search.subtitle":
    "Zoek op productnaam of merk. Resultaten komen van Open Food Facts via onze API.",
  "search.label": "Producten zoeken",
  "search.placeholder": "Probeer Oreo, Nutella of melkchocolade",
  "search.submit": "Zoeken",
  "search.searching": "Zoeken…",
  "search.idleHint": "Voer een productnaam in om te beginnen.",
  "search.validation.minLength": "Voer minstens 2 tekens in om te zoeken.",
  "search.resultsFor": "Resultaten voor “{query}”",
  "search.resultsTotal": " · {total} in totaal",
  "search.emptyTitle": "Geen producten gevonden voor “{query}”.",
  "search.emptyHint": "Probeer een andere productnaam of zoekterm.",
  "search.previous": "Vorige",
  "search.next": "Volgende",
  "search.retry": "Opnieuw",
  "search.upstreamError":
    "Productzoeken is tijdelijk niet beschikbaar. Probeer het opnieuw.",
  "search.genericError": "Er ging iets mis. Probeer het opnieuw.",

  "product.unknownName": "Onbekend product",
  "product.brandUnavailable": "Merk niet beschikbaar",

  "recent.title": "Recente zoekopdrachten",
  "recent.unavailable":
    "Recente zoekopdrachten niet beschikbaar (geen databaseverbinding).",

  "detail.back": "← Terug naar zoeken",
  "detail.barcode": "Barcode {barcode}",
  "detail.nutritionTitle": "Voedingswaarden",
  "detail.nutritionLocked":
    "Voedingsinformatie is beschikbaar met een abonnement. Er worden hier geen voedingswaarden getoond totdat de API toegang verleent.",
  "detail.notFound": "Product niet gevonden.",
  "detail.upstreamError":
    "Productdetails zijn tijdelijk niet beschikbaar. Probeer het opnieuw.",
  "detail.retry": "Opnieuw",
  "detail.genericError": "Er ging iets mis. Probeer het opnieuw.",

  "nutrition.per100g": "Per 100 g",
  "nutrition.energy": "Energie",
  "nutrition.fat": "Vetten",
  "nutrition.saturatedFat": "Verzadigde vetten",
  "nutrition.carbohydrates": "Koolhydraten",
  "nutrition.sugars": "Suikers",
  "nutrition.fiber": "Vezels",
  "nutrition.protein": "Eiwitten",
  "nutrition.salt": "Zout",
  "nutrition.unavailable": "Niet beschikbaar",

  "billing.subscribe": "Abonneren",
  "billing.subscribed": "Geabonneerd",
  "billing.price": "€4,99/maand",
  "billing.redirecting": "Doorsturen…",
  "billing.statusUnavailable": "Abonnementsstatus niet beschikbaar",
  "billing.checkoutFailed":
    "Afrekenen starten mislukt. Probeer het opnieuw.",
  "billing.successTitle": "Afrekenen voltooid",
  "billing.successBody":
    "Je betaling is succesvol ingediend. Abonnementstoegang wordt bevestigd door ons factureringssysteem.",
  "billing.cancelTitle": "Afrekenen geannuleerd",
  "billing.cancelBody": "Er zijn geen wijzigingen aan je abonnement aangebracht.",
  "billing.returnSearch": "Terug naar zoeken",
  "billing.returnHome": "Terug naar Pantry Lens",

  "error.OFF_UPSTREAM":
    "Productzoeken is tijdelijk niet beschikbaar. Probeer het opnieuw.",
  "error.OFF_TIMEOUT":
    "Productzoeken is tijdelijk niet beschikbaar. Probeer het opnieuw.",
  "error.PRODUCT_NOT_FOUND": "Product niet gevonden.",
  "error.VALIDATION_ERROR": "Controleer je zoekopdracht en probeer opnieuw.",
  "error.DATABASE_UNAVAILABLE":
    "Database niet beschikbaar. Probeer het later opnieuw.",
  "error.DEMO_USER_MISSING":
    "Database niet beschikbaar. Probeer het later opnieuw.",
  "error.ALREADY_SUBSCRIBED": "Je hebt al een actief abonnement.",
  "error.STRIPE_CHECKOUT_FAILED":
    "Afrekenen starten mislukt. Probeer het opnieuw.",
  "error.STRIPE_CONFIGURATION":
    "Abonnementsafrekenen is nog niet geconfigureerd.",
  "error.UNKNOWN_ERROR": "Er ging iets mis. Probeer het opnieuw.",
};
