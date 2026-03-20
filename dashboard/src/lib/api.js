import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error("Missing VITE_API_URL environment variable.");
}

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
