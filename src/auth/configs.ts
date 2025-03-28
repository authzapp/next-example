import NextAuth, {Session, User} from 'next-auth';
import {JWT} from "@auth/core/jwt";
import {AdapterUser} from "@auth/core/adapters";

import AuthZappProvider from "./provider";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [AuthZappProvider],
    callbacks: {
        async jwt({token, user}: { token: JWT, user: User | AdapterUser }) {
            if (user) {
                token.user = user;
            }
            return token;
        },
        async session({session, token}: { session: Session; token: JWT }) {
            if (token.user) {
                session.user = token.user as User | AdapterUser;
            }
            return session;
        },
    },
})