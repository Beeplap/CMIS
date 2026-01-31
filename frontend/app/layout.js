import SupabaseHealthCheck from "@/components/SupabaseHealthCheck";
import "./globals.css";

export const metadata = {
  title: "ScholarSync",
  description: "Ultimate application to manage and track administration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SupabaseHealthCheck />
        {children}
      </body>
    </html>
  );
}
