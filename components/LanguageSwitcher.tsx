'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { ChangeEvent, useTransition } from 'react';

export default function LanguageSwitcher() {
    const t = useTranslations('Settings');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;
        startTransition(() => {
            // We need to replace the locale in the pathname
            // pathname is like /pl/settings or /settings (if default)
            // But with next-intl middleware, pathname might include locale or not depending on config.
            // However, useRouter from next/navigation works with the current path.
            // To switch locale, we usually navigate to the new path.
            // But next-intl provides a Link and useRouter that handles locale?
            // Actually, standard next/navigation useRouter doesn't know about next-intl locales automatically for switching.
            // We should use `useRouter` from `next-intl/client`? No, `next-intl` provides `Link` and `usePathname` / `useRouter` wrappers.
            // Let's use standard navigation but construct the path.

            // If we use `next-intl/navigation`, it's easier.
            // Let's assume we need to replace the first segment if it's a locale.

            // Actually, let's use `next-intl`'s navigation APIs if possible.
            // But I haven't set up `navigation.ts` yet.
            // I'll stick to standard Next.js navigation for now and manually handle path.

            // Simple approach:
            // If path starts with /en or /pl, replace it.
            // If not, prepend it?

            let newPath = pathname;
            const segments = pathname.split('/');
            if (segments[1] === 'en' || segments[1] === 'pl') {
                segments[1] = nextLocale;
                newPath = segments.join('/');
            } else {
                newPath = `/${nextLocale}${pathname}`;
            }

            router.replace(newPath);
        });
    };

    return (
        <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('language')}
            </span>
            <select
                defaultValue={locale}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm p-2"
                onChange={onSelectChange}
                disabled={isPending}
            >
                <option value="pl">Polski</option>
                <option value="en">English</option>
            </select>
        </label>
    );
}
