import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";

export const metadata = {
  title: "Learnova AI — AI-Powered Personalized Learning Platform",
  description:
    "Transform dense study materials into interactive summaries, grounded doubt-solving, adaptive quizzes, and personalized revision recommendations with Learnova AI.",
  keywords: [
    "AI learning platform",
    "study materials summarizer",
    "active recall quizzes",
    "weak topic analyzer",
    "personalized revision",
    "student exam preparation",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-canvas text-surface-900 antialiased selection:bg-brand-500/30 selection:text-brand-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
