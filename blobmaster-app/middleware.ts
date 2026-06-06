// x402 payment enforcement moved to individual route handlers (withX402)
// so they run in Node.js runtime and can reach the x402.org facilitator.
// This file is kept to satisfy Next.js middleware conventions but does nothing.
export function middleware() {}

export const config = {
  matcher: [],
}
