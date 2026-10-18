import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Next.js only forwards request mutations to Server Components when the
  // updated header object is supplied explicitly. Recreate the response from
  // those headers after Supabase rotates auth cookies, otherwise the next
  // navigation can be rendered as anonymous immediately after sign-in.
  const nextResponse = () =>
    NextResponse.next({ request: { headers: request.headers } });
  let response = nextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // Validate and refresh the browser session before Server Components read it.
  // Keep this immediately after client creation: Supabase needs the same
  // response object to return a rotated refresh token to the browser.
  await supabase.auth.getClaims();

  return response;
}
