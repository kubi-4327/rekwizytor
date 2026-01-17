import { TourStep } from '@/components/ui/FeatureTour'

export const TOURS = {
    DEMO_FULL: {
        id: 'demo_full_tour',
        title: 'Wdrazająca Wycieczka Demo (Onboarding)',
        description: 'Podstawowe wprowadzenie do interfejsu i głównych funkcjonalności systemu.',
        steps: [
            {
                targetId: 'tour-start',
                title: 'Witaj w systemie!',
                content: 'Zapoznaj się z kluczowymi elementami interfejsu. Pomoże Ci to skuteczniej zarządzać rekwizytami.',
                position: 'bottom'
            },
            {
                targetId: 'tour-search',
                title: 'Wyszukiwanie AI',
                content: 'Nie musisz wpisywać dokładnej nazwy. Spróbuj opisać przedmiot własnymi słowami, np. "stara walizka na dokumenty".',
                position: 'bottom'
            },
            {
                targetId: 'tour-create',
                title: 'Szybkie dodawanie',
                content: 'Kliknij tutaj, aby dodać nowy element. Pamiętaj, że możesz też skorzystać z funkcji "Fast Add" (ikonka aparatu).',
                position: 'right'
            },
            {
                targetId: 'tour-stats',
                title: 'Monitoruj zasoby',
                content: 'Tutaj sprawdzisz zużycie tokenów AI oraz ilość miejsca w magazynie.',
                position: 'top'
            }
        ] as TourStep[]
    },
    DEMO_SINGLE: {
        id: 'demo_single_tour',
        title: 'Nowa Funkcja - Szybkie Dodawanie',
        description: 'Informacja o nowej funkcji szybkiego dodawania elementów.',
        steps: [
            {
                targetId: 'tour-create',
                title: 'Nowa Funkcja!',
                content: 'To jest pojedyncza podpowiedź (One-off Tip). Idealna do ogłaszania małych zmian lub nowości w interfejsie.',
                position: 'right'
            }
        ] as TourStep[]
    }
}
