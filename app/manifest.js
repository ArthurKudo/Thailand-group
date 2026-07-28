export default function manifest() {
  return {
    name: 'Tailândia em grupo',
    short_name: 'Tailândia',
    description: 'Roteiro, hospedagem, passeios e orçamento do grupo, tudo em um só lugar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6FAF8',
    theme_color: '#0B6E55',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
