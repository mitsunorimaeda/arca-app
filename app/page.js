"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const ADMIN_EMAILS = [
  "maeda@arca.fit",
  "eikei0502tr@gmail.com",
  "soccer7322@gmail.com",
  "idoriku413@icloud.com",
  "mejoraku@gmail.com",
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data?.session?.user) {
        router.push("/login");
        return;
      }

      const user = data.session.user;

      if (ADMIN_EMAILS.includes(user.email)) {
        router.push("/admin");
      } else {
        router.push("/athlete");
      }
    };

    redirectUser();
  }, []);

  return (
    <main className="p-8">
      <p>リダイレクト中...</p>
    </main>
  );
}
