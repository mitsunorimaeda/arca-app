"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAILS = ["maeda@arca.fit", "admin2@example.com"];

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("ログインに失敗しました: " + error.message);
    } else {
      const user = data.user;
      if (ADMIN_EMAILS.includes(user.email)) {
        router.push("/admin");
      } else {
        router.push("/athlete");
      }
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
        },
      },
    });
    if (error) {
      setMessage("登録に失敗しました: " + error.message);
    } else {
      setMessage("確認メールを送信しました。メールをご確認ください。");
      setEmail("");
      setPassword("");
      setNickname("");
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (user) {
        if (ADMIN_EMAILS.includes(user.email)) {
          router.push("/admin");
        } else {
          router.push("/athlete");
        }
      }
    };
    checkSession();
  }, []);

  return (
    <main className="p-8 max-w-md mx-auto text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">
        {isLogin ? "ログイン" : "新規登録"}
      </h1>

      <form
        onSubmit={isLogin ? handleLogin : handleSignUp}
        className="space-y-4"
      >
        {!isLogin && (
          <div>
            <label className="block mb-1">名前</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="border p-2 w-full text-black"
            />
          </div>
        )}
        <div>
          <label className="block mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border p-2 w-full text-black"
          />
        </div>
        <div>
          <label className="block mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border p-2 w-full text-black"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          {isLogin ? "ログイン" : "新規登録"}
        </button>
      </form>

      <p className="mt-4 text-sm">
        {isLogin ? "アカウントをお持ちでない方は " : "すでにアカウントをお持ちの方は "}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage("");
          }}
          className="text-blue-500 underline"
        >
          {isLogin ? "新規登録はこちら" : "ログインはこちら"}
        </button>
      </p>

      {message && <p className="mt-4 text-green-600 dark:text-green-400">{message}</p>}
    </main>
  );
}
