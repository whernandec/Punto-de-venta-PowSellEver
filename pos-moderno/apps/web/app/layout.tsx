import type { Metadata } from 'next';
import './globals.css';
import { AuthGate } from './AuthGate';

export const metadata: Metadata = {
  title: 'POS — Back-office',
  description: 'Administración del Punto de Venta PowSellEver',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="es">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
