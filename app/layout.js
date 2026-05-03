import "./globals.css";

export const metadata = {
  title: "Meta Receipt Generator | WeTrade",
  description: "Generate Meta-style invoice PDFs from campaign data",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
