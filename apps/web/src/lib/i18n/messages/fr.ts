import type { MessageKey } from "./en";

export const fr: Record<MessageKey, string> = {
  "language.label": "Langue",

  "search.title": "Trouver des produits alimentaires emballés",
  "search.subtitle":
    "Recherchez par nom de produit ou marque. Les résultats proviennent d’Open Food Facts via notre API.",
  "search.label": "Rechercher des produits",
  "search.placeholder": "Essayez Oreo, Nutella ou chocolat au lait",
  "search.submit": "Rechercher",
  "search.searching": "Recherche…",
  "search.idleHint": "Saisissez un nom de produit pour commencer.",
  "search.validation.minLength":
    "Saisissez au moins 2 caractères pour rechercher.",
  "search.resultsFor": "Résultats pour « {query} »",
  "search.resultsTotal": " · {total} au total",
  "search.emptyTitle": "Aucun produit trouvé pour « {query} ».",
  "search.emptyHint": "Essayez un autre nom de produit ou terme de recherche.",
  "search.previous": "Précédent",
  "search.next": "Suivant",
  "search.retry": "Réessayer",
  "search.upstreamError":
    "La recherche de produits est temporairement indisponible. Réessayez.",
  "search.genericError": "Une erreur s’est produite. Réessayez.",

  "product.unknownName": "Produit inconnu",
  "product.brandUnavailable": "Marque indisponible",

  "recent.title": "Recherches récentes",
  "recent.unavailable":
    "Recherches récentes indisponibles (base de données non connectée).",

  "detail.back": "← Retour à la recherche",
  "detail.barcode": "Code-barres {barcode}",
  "detail.nutritionTitle": "Informations nutritionnelles",
  "detail.nutritionLocked":
    "Les informations nutritionnelles sont disponibles avec un abonnement. Aucune valeur nutritionnelle n’est affichée ici tant que l’API n’accorde pas l’accès.",
  "detail.notFound": "Produit introuvable.",
  "detail.upstreamError":
    "Les détails du produit sont temporairement indisponibles. Réessayez.",
  "detail.retry": "Réessayer",
  "detail.genericError": "Une erreur s’est produite. Réessayez.",

  "nutrition.per100g": "Pour 100 g",
  "nutrition.energy": "Énergie",
  "nutrition.fat": "Matières grasses",
  "nutrition.saturatedFat": "Acides gras saturés",
  "nutrition.carbohydrates": "Glucides",
  "nutrition.sugars": "Sucres",
  "nutrition.fiber": "Fibres",
  "nutrition.protein": "Protéines",
  "nutrition.salt": "Sel",
  "nutrition.unavailable": "Indisponible",

  "billing.subscribe": "S’abonner",
  "billing.subscribed": "Abonné",
  "billing.price": "4,99 €/mois",
  "billing.redirecting": "Redirection…",
  "billing.statusUnavailable": "Statut d’abonnement indisponible",
  "billing.checkoutFailed":
    "Impossible de démarrer le paiement. Réessayez.",
  "billing.successTitle": "Paiement terminé",
  "billing.successBody":
    "Votre paiement a été envoyé avec succès. L’accès à l’abonnement est confirmé par notre système de facturation.",
  "billing.cancelTitle": "Paiement annulé",
  "billing.cancelBody":
    "Aucune modification n’a été apportée à votre abonnement.",
  "billing.returnSearch": "Retour à la recherche",
  "billing.returnHome": "Retour à Pantry Lens",

  "error.OFF_UPSTREAM":
    "La recherche de produits est temporairement indisponible. Réessayez.",
  "error.OFF_TIMEOUT":
    "La recherche de produits est temporairement indisponible. Réessayez.",
  "error.PRODUCT_NOT_FOUND": "Produit introuvable.",
  "error.VALIDATION_ERROR":
    "Vérifiez votre recherche et réessayez.",
  "error.DATABASE_UNAVAILABLE":
    "Base de données indisponible. Réessayez plus tard.",
  "error.DEMO_USER_MISSING":
    "Base de données indisponible. Réessayez plus tard.",
  "error.ALREADY_SUBSCRIBED": "Vous avez déjà un abonnement actif.",
  "error.STRIPE_CHECKOUT_FAILED":
    "Impossible de démarrer le paiement. Réessayez.",
  "error.STRIPE_CONFIGURATION":
    "Le paiement d’abonnement n’est pas encore configuré.",
  "error.UNKNOWN_ERROR": "Une erreur s’est produite. Réessayez.",
};
