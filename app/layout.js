import './globals.css';

export const metadata = {
  title: 'Tailândia em grupo',
  description: 'Roteiro, hospedagem, passeios e orçamento do grupo, tudo em um só lugar.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tailândia em grupo',
  },
};

export const viewport = {
  themeColor: '#0B6E55',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
