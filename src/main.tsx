/**
 * Electron Renderer Entry Point
 * React Router in library mode — no SSR, no server bundle.
 */
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import "./app/global.css";

// Import page components directly
import DashboardPage from "./app/dashboard/page";
import SessionsPage from "./app/sessions/page";
import SyllabusPage from "./app/syllabus/page";
import QuizPage from "./app/quiz/page";
import FlashcardsPage from "./app/flashcards/page";
import CodingPage from "./app/coding/page";
import InterviewPage from "./app/interview/page";
import AiExplorerPage from "./app/ai-explorer/page";
import AnalyticsPage from "./app/analytics/page";
import AchievementsPage from "./app/achievements/page";
import SettingsPage from "./app/settings/page";

const router = createHashRouter([
  { path: "/", element: <DashboardPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/sessions", element: <SessionsPage /> },
  { path: "/syllabus", element: <SyllabusPage /> },
  { path: "/quiz", element: <QuizPage /> },
  { path: "/flashcards", element: <FlashcardsPage /> },
  { path: "/coding", element: <CodingPage /> },
  { path: "/interview", element: <InterviewPage /> },
  { path: "/ai-explorer", element: <AiExplorerPage /> },
  { path: "/analytics", element: <AnalyticsPage /> },
  { path: "/achievements", element: <AchievementsPage /> },
  { path: "/settings", element: <SettingsPage /> },
]);

const root = createRoot(document.getElementById("root")!);
root.render(<RouterProvider router={router} />);
