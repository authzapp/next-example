import {LoginPage} from "@/auth/login.page";

export default async function Page({params}: { params: Promise<{ authorizer: string }> }) {

    const {authorizer} = await params;
    return <LoginPage authorizer={authorizer}/>

}
