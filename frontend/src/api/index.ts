// lib/api.ts
import { API_URL } from "@/constant/config";
import axios from "axios";

export const Api = axios.create({
  baseURL: API_URL,
});
