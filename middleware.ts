// middleware.ts — Edge Runtime uyumlu
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Token yenileme — session'ı güncel tut
  await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // /panel/* — auth zorunlu
  if (pathname.startsWith('/panel')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // /auth/* — giriş yapmışsa panel'e yönlendir (setup hariç)
  if (
    pathname.startsWith('/auth') &&
    !pathname.startsWith('/auth/setup')
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(new URL('/panel', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aşağıdakileri hariç tut:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, manifest, sw.js (public assets)
     * - api routes (kendi auth'ları var)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.png$|.*\\.svg$|api/).*)',
  ],
}
