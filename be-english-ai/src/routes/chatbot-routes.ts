import { Router } from "express";
import { generateChatbotAnswerHandler } from "../controllers/chatbot/chatbot-controller";
import { asyncHandler } from "../utils/async-handler";

export const chatbotRoutes = Router();

chatbotRoutes.post("/GenerateAnswer", asyncHandler(generateChatbotAnswerHandler));
