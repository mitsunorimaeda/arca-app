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

const ADMIN_EMAILS = ["maeda@arca.fit", "admin2@example.com"];

export default function AdminPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [user, setUser] = useState(null);
  const [group, setGroup] = useState("");
  const [fatigue, setFatigue] = useState(5);
  const [records, setRecords] = useState([]);
  const [practiceTimes, setPracticeTimes] = useState([]);
  const [practiceGroup, setPracticeGroup] = useState("T1");
  const [practiceStart, setPracticeStart] = useState("");
  const [practiceEnd, setPracticeEnd] = useState("");
  const [groupAverages, setGroupAverages] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [daysFilter, setDaysFilter] = useState(7);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.push("/login");
        return;
      }
      const currentUser = data.user;
      setUser(currentUser);

      const today = new Date().toISOString().split("T")[0];
      setDate(today);

      await fetchRecords();
      await fetchPracticeTimes();
    };
    fetchUserAndData();
  }, []);

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .order("date", { ascending: true });

    if (!error) {
      setRecords(data);
      const averages = getGroupAverageData(data);
      setGroupAverages(averages);
    }
  };

  const fetchPracticeTimes = async () => {
    const { data, error } = await supabase
      .from("practice_times")
      .select("*")
      .order("date", { ascending: true });
    if (!error) {
      setPracticeTimes(data);
    }
  };

  const getGroupAverageData = (records) => {
    const grouped = {};
    records.forEach((r) => {
      const key = `${r.date}-${r.group}`;
      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, date: r.date, group: r.group };
      }
      grouped[key].total += Number(r.fatigue);
      grouped[key].count += 1;
    });
    return Object.values(grouped)
      .map((g) => ({
        date: g.date,
        group: g.group,
        average: Number((g.total / g.count).toFixed(2)),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const calculatePracticeMinutes = (start, end) => {
    if (!start || !end) return null;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  };

  const handleSavePracticeTime = async (e) => {
    e.preventDefault();
    const minutes = calculatePracticeMinutes(practiceStart, practiceEnd);
    const { error } = await supabase.from("practice_times").insert([
      {
        date,
        group_name: practiceGroup,
        start_time: practiceStart,
        end_time: practiceEnd,
        practice_minutes: minutes,
      },
    ]);
    if (error) {
      alert("保存失敗: " + error.message);
    } else {
      alert("練習時間を保存しました！");
      setPracticeGroup("T1");
      setPracticeStart("");
      setPracticeEnd("");
      fetchPracticeTimes();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const today = new Date();
  const recentDates = [...new Set(records.map((r) => r.date))]
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 2);

  const filteredPracticeTimes = practiceTimes.filter(
    (pt) => selectedGroup === "all" || pt.group_name === selectedGroup
  );

  const dateLimit = new Date();
  dateLimit.setDate(today.getDate() - daysFilter);

  return (
    <main className="p-6 text-gray-900 dark:text-white max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">疲労度管理（管理者）</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">
          ログアウト
        </button>
      </div>

      {/* 練習時間の登録フォーム */}
      <form onSubmit={handleSavePracticeTime} className="space-y-4 mb-10 bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">⏱ 練習時間 登録</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2 rounded" />
          <select value={practiceGroup} onChange={(e) => setPracticeGroup(e.target.value)} className="border p-2 rounded">
            {["T1", "T2", "S1", "S2", "R"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <input type="time" value={practiceStart} onChange={(e) => setPracticeStart(e.target.value)} className="border p-2 rounded" />
          <input type="time" value={practiceEnd} onChange={(e) => setPracticeEnd(e.target.value)} className="border p-2 rounded" />
        </div>
        <button type="submit" className="bg-teal-600 text-white p-2 rounded w-full sm:w-auto">
          保存
        </button>
      </form>

      {/* グループ別平均疲労度グラフ */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-2">📊 グループ別 平均疲労度推移</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={groupAverages}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            {[...new Set(groupAverages.map((d) => d.group))].map((group, idx) => (
              <Line
                key={group}
                type="monotone"
                dataKey={(d) => (d.group === group ? d.average : null)}
                name={group}
                stroke={`hsl(${(idx * 60) % 360}, 70%, 50%)`}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 直近2日間の記録カード */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">📅 直近2日間の記録</h2>
        <div className="mb-2">
          <label className="mr-2">グループ：</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">すべて</option>
            {["T1", "T2", "S1", "S2", "R"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentDates.map((d) => {
            const recordsForDate = records.filter(
              (r) => r.date === d && (selectedGroup === "all" || r.group === selectedGroup)
            );
            const avg = recordsForDate.length
              ? (
                  recordsForDate.reduce((sum, r) => sum + Number(r.fatigue), 0) /
                  recordsForDate.length
                ).toFixed(2)
              : "-";
            const time = practiceTimes.find((pt) => pt.date === d && (selectedGroup === "all" || pt.group_name === selectedGroup));

            return (
              <div key={d} className="bg-white dark:bg-gray-800 p-4 rounded border">
                <p className="font-bold mb-1">📆 {d}</p>
                <p className="text-sm">練習時間: {time ? `${time.start_time}〜${time.end_time}（${time.practice_minutes}分）` : "未入力"}</p>
                <p className="text-sm">平均疲労度: {avg}</p>
                <ul className="text-sm mt-2">
                  {recordsForDate.map((r) => (
                    <li key={r.id}>
                      {r.name}：疲労度 {r.fatigue}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* 表形式 */}
      <div>
        <h2 className="text-lg font-semibold mb-2">📋 練習時間と平均疲労度（表）</h2>
        <div className="mb-2 flex gap-4">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">すべて</option>
            {["T1", "T2", "S1", "S2", "R"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="border p-2 rounded"
          >
            {[3, 5, 7, 10, 14].map((d) => (
              <option key={d} value={d}>
                直近{d}日間
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border px-2 py-1">日付</th>
                <th className="border px-2 py-1">グループ</th>
                <th className="border px-2 py-1">開始</th>
                <th className="border px-2 py-1">終了</th>
                <th className="border px-2 py-1">時間(分)</th>
                <th className="border px-2 py-1">平均疲労度</th>
              </tr>
            </thead>
            <tbody>
              {filteredPracticeTimes
                .filter((pt) => new Date(pt.date) >= dateLimit)
                .map((pt, idx) => {
                  const related = records.filter(
                    (r) => r.date === pt.date && r.group === pt.group_name
                  );
                  const avg = related.length
                    ? (
                        related.reduce((sum, r) => sum + Number(r.fatigue), 0) /
                        related.length
                      ).toFixed(2)
                    : "-";

                  return (
                    <tr key={`${pt.date}-${pt.group_name}-${idx}`} className="bg-white dark:bg-gray-800">
                      <td className="border px-2 py-1">{pt.date}</td>
                      <td className="border px-2 py-1">{pt.group_name}</td>
                      <td className="border px-2 py-1">{pt.start_time}</td>
                      <td className="border px-2 py-1">{pt.end_time}</td>
                      <td className="border px-2 py-1">{pt.practice_minutes}</td>
                      <td className="border px-2 py-1">{avg}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
