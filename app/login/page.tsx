import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/primitives";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Accesso analista" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-sm space-y-4 py-8">
      <h1 className="text-xl font-semibold">Accesso analista</h1>
      <p className="text-sm text-muted">
        Il login serve solo per salvare analisi e creare report. Tutto il resto è consultabile senza account.
        Le registrazioni sono chiuse.
      </p>
      <Card>
        <Suspense fallback={<LoginForm />}>
          <WithNext searchParams={props.searchParams} />
        </Suspense>
      </Card>
    </div>
  );
}

async function WithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const next = (await searchParams).next;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
