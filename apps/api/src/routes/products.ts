import { Router } from "express";

import {
  parseBarcode,
  parseLanguage,
  parsePage,
  parseSearchQuery,
} from "../lib/language";
import { getProductDetail, searchProducts } from "../services/products";

export const productsRouter = Router();

productsRouter.get("/search", async (req, res, next) => {
  try {
    const query = parseSearchQuery(req.query.q);
    const lang = parseLanguage(req.query.lang);
    const page = parsePage(req.query.page);
    const result = await searchProducts(query, lang, page);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:barcode", async (req, res, next) => {
  try {
    const barcode = parseBarcode(req.params.barcode);
    const lang = parseLanguage(req.query.lang);
    const product = await getProductDetail(barcode, lang);
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
});
