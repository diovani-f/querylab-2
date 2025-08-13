import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas que requerem autenticação
const protectedRoutes = [
  '/',
  '/profile',
  '/settings',
  '/admin'
]

// Rotas que NÃO devem ser acessadas por usuários autenticados
const authRoutes = [
  '/login',
  '/register'
]

export function middleware(request: NextRequest) {
  // Verificar se há token no localStorage (não é possível no middleware)
  // O middleware do Next.js roda no servidor, então não temos acesso ao localStorage
  // Vamos deixar a verificação para os componentes do lado do cliente

  // Por enquanto, apenas permitir todas as rotas
  // A verificação real será feita nos componentes ProtectedRoute
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
