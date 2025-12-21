import axios from "axios";
import { getAccess, getRefresh, setTokens, clearTokens } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
        // مهم: endpoint غالباً عندك هو /api/auth/token/refresh/
        const r = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/token/refresh/`,
          { refresh }
        );

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
