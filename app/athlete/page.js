"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AthletePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [date, setDate] = useState("");
  const [group, setGroup] = useState("");
  const [fatigue, setFatigue] = useState(5);
  const [records, setRecords] = useState([]);
  const [practiceTimes, setPracticeTimes] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchRecords(data.user.id);
        fetchPracticeTimes();
      }
    };
    fetchUser();
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchRecords = async (userId) => {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });
    if (!error) setRecords(data);
  };

  const fetchPracticeTimes = async () => {
    const { data, error } = await supabase
      .from("practice_times")
      .select("*")
      .order("date", { ascending: true });
    if (!error) setPracticeTimes(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data: session } = await supabase.auth.getUser();
    if (!session?.user) return;
    const insertData = {
      date,
      group,
      fatigue: Number(fatigue),
      user_id: session.user.id,
      name: session.user.user_metadata?.nickname || session.user.email,
    };
    const { error } = await supabase.from("records").insert([insertData]);
    if (error) {
      alert("保存に失敗しました: " + error.message);
    } else {
      alert("保存完了！");
      setGroup("");
      setFatigue(5);
      fetchRecords(session.user.id);
    }
  };

  const userGroup = records.length > 0 ? records[records.length - 1].group : "";
  const personalGraphData = records.map((r) => ({
    date: r.date,
    fatigue: r.fatigue,
  }));

  const groupGraphData = records
    .filter((r) => r.group === userGroup)
    .reduce((acc, r) => {
      const key = r.date;
      if (!acc[key]) acc[key] = { total: 0, count: 0, date: key };
      acc[key].total += Number(r.fatigue);
      acc[key].count += 1;
      return acc;
    }, {});
  const groupAverages = Object.values(groupGraphData).map((g) => ({
    date: g.date,
    average: (g.total / g.count).toFixed(2),
  }));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="p-6 max-w-3xl mx-auto text-gray-900 dark:text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-teal-600">選手用ページ</h1>
        <button onClick={handleLogout} className="text-sm text-teal-500 underline">
          ログアウト
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block mb-1 font-semibold">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">グループ</label>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="border p-2 w-full rounded"
            required
          >
            <option value="">グループを選択</option>
            {["T1", "T2", "S1", "S2", "R"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fatigue" className="block font-semibold">疲労度：{fatigue}</label>
          <input
            type="range"
            id="fatigue"
            min="0"
            max="10"
            step="0.1"
            value={fatigue}
            onChange={(e) => setFatigue(e.target.value)}
            className="w-full"
          />
        </div>

        <button type="submit" className="bg-teal-500 text-white px-4 py-2 rounded w-full">
          記録する
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-2">📈 個人疲労度推移</h2>
      <div className="h-60 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={personalGraphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Line type="monotone" dataKey="fatigue" stroke="#14b8a6" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className="text-lg font-semibold mb-2">🧑‍🤝‍🧑 グループ平均疲労度推移</h2>
      <div className="h-60 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={groupAverages}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Line type="monotone" dataKey="average" stroke="#0d9488" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className="text-lg font-semibold mb-2">📋 練習時間一覧</h2>
      <div className="space-y-2">
        {practiceTimes
          .filter((pt) => pt.group_name === userGroup)
          .map((pt) => {
            const fatigueRecords = records.filter((r) => r.date === pt.date);
            return (
              <div key={pt.date} className="border rounded p-3 bg-white dark:bg-gray-800">
                <p>📅 {pt.date}</p>
                <p>🕒 {pt.start_time} - {pt.end_time}（{pt.practice_minutes} 分）</p>
                {fatigueRecords.map((r) => (
                  <p key={r.id} className="text-sm text-gray-700 dark:text-gray-300">
                    {r.name}: 疲労度 {r.fatigue}
                  </p>
                ))}
              </div>
            );
          })}
      </div>
    </main>
  );
}
