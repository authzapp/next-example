export function LoginButton() {

    return <a className="btn-login" href={`https://authzapp.com/authorize/${process.env.AZ_APP_KEY}`}>
        Login with WhatsApp
    </a>;
}
