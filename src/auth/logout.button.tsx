import {signOut} from "@/auth/configs";

export function LogoutButton() {

    return <form action={async () => {
        "use server"
        await signOut({redirectTo: '/'})
    }}>
        <button type="submit" className="btn-logout">Logout</button>
    </form>;
}
