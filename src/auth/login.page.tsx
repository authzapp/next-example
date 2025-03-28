'use client';

import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {signIn} from "next-auth/react";
import Link from "next/link";

export function LoginPage({authorizer, redirectTo}: { authorizer: string, redirectTo?: string }) {

    const router = useRouter();

    const [error, setError] = useState<string>();

    const login = useCallback(() => {

        if (authorizer) {
            setError(undefined);
        } else {
            return setError(' ');
        }

        signIn('authzapp', {authorizer, redirect: false})
            .then((response) => {
                if (response?.error) {
                    setError(response.code);
                } else {
                    router.replace(redirectTo || '/');
                }
            })
            .catch((e) => {
                setError(e?.message || 'UNEXPECTED_AUTHENTICATION_ERROR')
            });

    }, [authorizer, router, redirectTo]);

    useEffect(login, []);

    return error ? (
        <div>
            <h4 className="mb-3">{error}</h4>
            <Link className="btn-back" href={'/'}>
                to go back
            </Link>
        </div>
    ) : (
        <div>
            <h2>loading...</h2>
        </div>
    );
}
