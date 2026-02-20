import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata = {
  title: "ScholarSync",
  description: "College Management and Information System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
