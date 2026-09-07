import type { MessageKey } from "./en";

export const de: Record<MessageKey, string> = {
  "language.label": "Sprache",

  "search.title": "Verpackte Lebensmittel finden",
  "search.subtitle":
    "Suche nach Produktname oder Marke. Ergebnisse kommen von Open Food Facts über unsere API.",
  "search.label": "Produkte suchen",
  "search.placeholder": "Zum Beispiel Oreo, Nutella oder Milchschokolade",
  "search.submit": "Suchen",
  "search.searching": "Suche…",
  "search.idleHint": "Gib einen Produktnamen ein, um zu beginnen.",
  "search.validation.minLength":
    "Gib mindestens 2 Zeichen ein, um zu suchen.",
  "search.resultsFor": "Ergebnisse für „{query}“",
  "search.resultsTotal": " · {total} insgesamt",
  "search.emptyTitle": "Keine Produkte für „{query}“ gefunden.",
  "search.emptyHint": "Versuche einen anderen Produktnamen oder Suchbegriff.",
  "search.previous": "Zurück",
  "search.next": "Weiter",
  "search.retry": "Erneut versuchen",
  "search.upstreamError":
    "Die Produktsuche ist vorübergehend nicht verfügbar. Bitte erneut versuchen.",
  "search.genericError": "Etwas ist schiefgelaufen. Bitte erneut versuchen.",

  "product.unknownName": "Unbekanntes Produkt",
  "product.brandUnavailable": "Marke nicht verfügbar",

  "recent.title": "Letzte Suchen",
  "recent.unavailable":
    "Letzte Suchen nicht verfügbar (keine Datenbankverbindung).",

  "detail.back": "← Zurück zur Suche",
  "detail.barcode": "Barcode {barcode}",
  "detail.nutritionTitle": "Nährwertangaben",
  "detail.nutritionLocked":
    "Nährwertinformationen sind mit einem Abonnement verfügbar. Hier werden keine Nährwerte angezeigt, bis die API Zugriff gewährt.",
  "detail.notFound": "Produkt nicht gefunden.",
  "detail.upstreamError":
    "Produktdetails sind vorübergehend nicht verfügbar. Bitte erneut versuchen.",
  "detail.retry": "Erneut versuchen",
  "detail.genericError": "Etwas ist schiefgelaufen. Bitte erneut versuchen.",

  "nutrition.per100g": "Pro 100 g",
  "nutrition.energy": "Energie",
  "nutrition.fat": "Fett",
  "nutrition.saturatedFat": "Gesättigte Fettsäuren",
  "nutrition.carbohydrates": "Kohlenhydrate",
  "nutrition.sugars": "Zucker",
  "nutrition.fiber": "Ballaststoffe",
  "nutrition.protein": "Eiweiß",
  "nutrition.salt": "Salz",
  "nutrition.unavailable": "Nicht verfügbar",

  "billing.subscribe": "Abonnieren",
  "billing.subscribed": "Abonniert",
  "billing.price": "€4,99/Monat",
  "billing.redirecting": "Weiterleitung…",
  "billing.statusUnavailable": "Abonnementstatus nicht verfügbar",
  "billing.checkoutFailed":
    "Checkout konnte nicht gestartet werden. Bitte erneut versuchen.",
  "billing.successTitle": "Checkout abgeschlossen",
  "billing.successBody":
    "Deine Zahlung wurde erfolgreich übermittelt. Der Abonnementzugriff wird von unserem Abrechnungssystem bestätigt.",
  "billing.cancelTitle": "Checkout abgebrochen",
  "billing.cancelBody":
    "An deinem Abonnement wurden keine Änderungen vorgenommen.",
  "billing.returnSearch": "Zurück zur Suche",
  "billing.returnHome": "Zurück zu Pantry Lens",

  "error.OFF_UPSTREAM":
    "Die Produktsuche ist vorübergehend nicht verfügbar. Bitte erneut versuchen.",
  "error.OFF_TIMEOUT":
    "Die Produktsuche ist vorübergehend nicht verfügbar. Bitte erneut versuchen.",
  "error.PRODUCT_NOT_FOUND": "Produkt nicht gefunden.",
  "error.VALIDATION_ERROR":
    "Bitte prüfe deine Suche und versuche es erneut.",
  "error.DATABASE_UNAVAILABLE":
    "Datenbank nicht verfügbar. Bitte später erneut versuchen.",
  "error.DEMO_USER_MISSING":
    "Datenbank nicht verfügbar. Bitte später erneut versuchen.",
  "error.ALREADY_SUBSCRIBED": "Du hast bereits ein aktives Abonnement.",
  "error.STRIPE_CHECKOUT_FAILED":
    "Checkout konnte nicht gestartet werden. Bitte erneut versuchen.",
  "error.STRIPE_CONFIGURATION":
    "Abonnement-Checkout ist noch nicht konfiguriert.",
  "error.UNKNOWN_ERROR": "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
};
