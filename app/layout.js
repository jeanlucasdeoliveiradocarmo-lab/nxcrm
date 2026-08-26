import "./globals.css";

export const metadata = {
  title: {
    default: "NX CRM",
    template: "%s",
  },
  description: "NX CRM — gestão de leads e funil de vendas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
