import { useState, useEffect } from 'react';

export const useIsLocalhost = () => {
    const [isLocalhost, setIsLocalhost] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            setIsLocalhost(
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') || // Optional: often useful for local network testing
                hostname === '[::1]'
            );
        }
    }, []);

    return isLocalhost;
};
