import { AuthProvider } from "./components/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "Architect AI",
  description: "Software Research & Planning Agent",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
