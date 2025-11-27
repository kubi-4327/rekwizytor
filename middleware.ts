import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    // First run the intl middleware to handle locale routing
    const response = intlMiddleware(request);

    // Then run the supabase middleware, passing the response
    // Note: updateSession might need to be adjusted to accept a response or we chain them differently.
    // Typically updateSession creates a response. We might need to copy headers.

    // Let's try to run updateSession and see if we can merge.
    // Actually, updateSession usually returns a response.
    // If we want to preserve the locale handling, we should probably let intlMiddleware handle the response creation
    // and then update the session on that response?

    // A common pattern is:
    // 1. Run intl middleware
    // 2. Pass that response to supabase middleware to update cookies/session

    return await updateSession(request, response);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
