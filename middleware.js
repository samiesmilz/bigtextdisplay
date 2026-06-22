const BOTS = /facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|embedly|googlebot/i;

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  if (url.pathname !== '/' || !BOTS.test(ua)) {
    return;
  }

  const preview = new URL('/api/preview', url.origin);
  url.searchParams.forEach((v, k) => preview.searchParams.set(k, v));
  return Response.redirect(preview, 302);
}

export const config = {
  matcher: '/',
};