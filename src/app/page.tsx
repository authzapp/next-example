import { cookies } from "next/headers";
import { sessionCookie, readSession } from "@/auth/session";
import { Login } from "./login";
export const dynamic = "force-dynamic";
export default async function Page() {
  const phone = readSession((await cookies()).get(sessionCookie().name)?.value);
  return <Login initialPhone={phone} />;
}
