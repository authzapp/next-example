import {auth} from "@/auth/configs";

import {LogoutButton} from "@/auth/logout.button";
import {LoginButton} from "@/auth/login.button";

export default async function Home() {

    const session = await auth();

    return (
        <div>

            {session?.user ? (
                <div>
                    <pre>{JSON.stringify(session.user, null, ' ')}</pre>
                    <LogoutButton/>
                </div>
            ) : (
                <LoginButton/>
            )}

        </div>
    );
}
