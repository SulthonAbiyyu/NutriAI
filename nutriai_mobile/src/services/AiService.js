import api from "../config/api";

export const getMealSuggestion = async () => {
  const res = await api.get("/api/ai/meal-suggestion");
  return res.data;
};

export const analyzeFoodImage = async (imageBase64) => {
  const res = await api.post("/api/ai/analyze-image", {
    image_base64: imageBase64,
  });
  return res.data;
};

export const chatWithAI = async (message, history = []) => {
  const res = await api.post("/api/ai/chat", { message, history });
  return res.data;
};

export const getWeeklyAnalysis = async () => {
  const res = await api.get("/api/ai/weekly-analysis");
  return res.data;
};
