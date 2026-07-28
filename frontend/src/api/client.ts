import axios from "axios";
import type {
  ExposureResponse, ExpirationsResponse, GreeksResponse, HeatmapResponse,
  MaxPainResponse, OptionsChainResponse, PriceResponse,
  IntelligenceResponse, QueryResponse, QuestionsListResponse,
  HedgingStrengthResponse, YieldAnomalyResponse,
} from "../types";

// El frontend SOLO habla con esta API propia (ver vite.config.ts: /api
// se proxea a http://localhost:8000). Nunca se importa un SDK de Yahoo
// aquí — esa es precisamente la regla de arquitectura que pediste.
const api = axios.create({ baseURL: "/api/v1" });

export interface QueryParams {
  ticker?: string;
  expiration?: string;
}

export const marketApi = {
  getPrice: (params?: QueryParams) =>
    api.get<PriceResponse>("/price", { params }).then((r) => r.data),

  getExpirations: (params?: QueryParams) =>
    api.get<ExpirationsResponse>("/expirations", { params }).then((r) => r.data),

  getOptions: (params?: QueryParams) =>
    api.get<OptionsChainResponse>("/options", { params }).then((r) => r.data),

  getGreeks: (params?: QueryParams) =>
    api.get<GreeksResponse>("/greeks", { params }).then((r) => r.data),

  getExposure: (params?: QueryParams) =>
    api.get<ExposureResponse>("/gex", { params }).then((r) => r.data),

  getMaxPain: (params?: QueryParams) =>
    api.get<MaxPainResponse>("/maxpain", { params }).then((r) => r.data),

  getHeatmap: (params?: QueryParams & { metric?: string }) =>
    api.get<HeatmapResponse>("/heatmap", { params }).then((r) => r.data),

  getIntelligence: (params?: QueryParams) =>
    api.get<IntelligenceResponse>("/intelligence", { params }).then((r) => r.data),

  getQuestions: () =>
    api.get<QuestionsListResponse>("/questions").then((r) => r.data),

  getQuery: (params: QueryParams & { question_key: string }) =>
    api.get<QueryResponse>("/query", { params }).then((r) => r.data),

  downloadReport: (params?: QueryParams) =>
    api.get("/download-report", {
      params,
      responseType: "blob",
    }).then((r) => r.data as Blob),

  getHedgingStrength: (params?: QueryParams) =>
    api.get<HedgingStrengthResponse>("/hedging-strength", { params }).then((r) => r.data),

  getYieldAnomaly: () =>
    api.get<YieldAnomalyResponse>("/yield-anomaly").then((r) => r.data),
};
