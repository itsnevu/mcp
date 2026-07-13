import { NextResponse } from "next/server";
import { GEO_LANG_COOKIE, resolveLangFromHeaders } from "@/lib/geoLang";

/* The visitor's IP is only visible to the server, so the language it implies has
   to reach the client somehow: proxy resolves it from the host's geo header and
   hands it over in a readable cookie. The client treats that as a guess and still
   lets a saved choice win — see I18nProvider. */
export function proxy(request) {
  const response = NextResponse.next();
  const lang = resolveLangFromHeaders(request.headers);

  /* Only write when the guess actually changed (first visit, or the user moved
     country), so the common case adds no Set-Cookie to the response. */
  if (request.cookies.get(GEO_LANG_COOKIE)?.value !== lang) {
    response.cookies.set(GEO_LANG_COOKIE, lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      /* Readable from JS on purpose — I18nProvider is the only consumer. */
      httpOnly: false,
    });
  }

  return response;
}

/* Document requests only. The API answers callers, not readers, and /_next and
   the static assets have no language to pick. */
export const config = {
  matcher: ["/((?!api/|_next/|.*\\.[\\w]+$).*)"],
};
