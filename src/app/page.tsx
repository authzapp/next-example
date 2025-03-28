import {auth} from "@/auth";

export default async function Home() {

    const session = await auth();

    return (
        <div className="screen">

            {session?.user ? (
                <a className="btn-logout" href="https://authzapp.com/login/my-app-key-example">
                    Logout
                </a>
            ) : (
                <a className="btn-login" href={`https://authzapp.com/authorize/${process.env.AZ_APP_KEY}`}>
                    Login with WhatsApp
                </a>
            )}

            <pre>{session?.user ? JSON.stringify(session.user) : 'UNAUTHORIZED'}</pre>

        </div>
    );
}
