import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const supabase = await createClient();

    // Check if user is already logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect must be called outside try-catch (it throws NEXT_REDIRECT intentionally)
    if (user) {
        redirect("/dashboard");
    }

    const params = await searchParams;
    const error = typeof params.error === "string" ? params.error : undefined;

    return <LoginForm error={error} />;
}

