import CredentialsProvider from "next-auth/providers/credentials";
import {CredentialsSignin} from "next-auth";

type AZUser = {
    uuid: string,
    name: string,
    phone: string,
    email: string,
    image?: string,
}

export default function Provider() {

    return CredentialsProvider({
        id: "authzapp",
        name: "AuthZapp",
        credentials: {
            authorizer: {label: "Authorizer", type: "text"}
        },
        async authorize(credentials) {
            const response = await fetch(`https://authzapp.com/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_key: process.env.AZ_APP_KEY,
                    app_secret: process.env.AZ_APP_SECRET,
                    authorizer: credentials.authorizer,
                })
            });

            if (!response.ok) {
                const body = await response.json();
                const error = new CredentialsSignin();
                error.code = body?.message || 'UNEXPECTED_ERROR'
                throw error;
            }

            const user: AZUser = await response.json();

            // TODO: create or update your user table
            // TODO: add your custom validation to allow or deny user login

            return user;
        }
    });
}
