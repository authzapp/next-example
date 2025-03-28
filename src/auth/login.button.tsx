import Link from "next/link";

export function LoginButton() {

    const key = process.env.AZ_APP_KEY;

    return <Link
        className="btn-login"
        href={`https://authzapp.com/authorize/${key}`}
    >
        Login with WhatsApp
    </Link>;
}