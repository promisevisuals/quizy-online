import { createFileRoute } from "@tanstack/react-router";
import { QuizApp } from "@/components/quiz/QuizApp";
import { KingsApp } from "@/components/kings/KingsApp";
import { IS_KINGS } from "@/lib/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return IS_KINGS ? <KingsApp /> : <QuizApp />;
}
