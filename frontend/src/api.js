import axios from "axios";
import { getAccess, getRefresh, setTokens, clearTokens } from "./auth";

function normalizeApiBaseUrl(rawBaseUrl) {
  const trimmed = (rawBaseUrl || "").trim();
  if (!trimmed) return "";

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed.replace(/\/$/, "");
  }

  const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
    parsed.hostname
  );

  // Django runserver المحلي لا يدعم HTTPS افتراضياً
  if (isLocalHost && parsed.protocol === "https:") {
    parsed.protocol = "http:";
  }

  return parsed.toString().replace(/\/$/, "");
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: apiBaseUrl,
});

// 1) Attach access token لكل request
api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 2) Auto refresh لو access انتهى ورجع 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

    // إذا 401 ولم نجرب refresh قبل
    if (status === 401 && !original._retry) {
      original._retry = true;

      const refresh = getRefresh();
      if (!refresh) {
        clearTokens();
        window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        const refreshPath = "/api/auth/token/refresh/";
        const r = await axios.post(`${apiBaseUrl}${refreshPath}`, { refresh });

        const newAccess = r.data.access;
        setTokens({ access: newAccess, refresh }); // نحدّث access فقط
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original); // نعيد الطلب الأصلي
      } catch (e) {
        clearTokens();
        window.location.href = "/";
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;