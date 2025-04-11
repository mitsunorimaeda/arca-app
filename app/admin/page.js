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

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [practiceTimes, setPracticeTimes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/login");
        return;
      }
      const currentUser = data.user;
      setUser(currentUser);

      const { data: userInfo } = await supabase
        .from("users")
        .select("role")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (userInfo?.role !== "admin") {
        router.push("/login");
      }

      fetchTeams();
      fetchUsers();
      fetchRecords();
      fetchPracticeTimes();
    };
    fetchData();
  }, []);

  const fetchTeams = async () => {
    const { data } = await supabase.from("teams").select("*").order("name");
    setTeams(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("email");
    setUsers(data || []);
  };

  const fetchRecords = async () => {
    const { data } = await supabase.from("fatigue_records").select("*").order("date");
    setRecords(data || []);
  };

  const fetchPracticeTimes = async () => {
    const { data } = await supabase.from("practice_times").select("*").order("date");
    setPracticeTimes(data || []);
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    await supabase.from("teams").insert([{ name: newTeamName }]);
    setNewTeamName("");
    fetchTeams();
  };

  const handleDeleteTeam = async (id) => {
    await supabase.from("teams").delete().eq("id", id);
    fetchTeams();
  };

  const handleUserUpdate = async (userId, teamId, role) => {
    await supabase.from("users").update({ team_id: teamId, role }).eq("id", userId);
    fetchUsers();
  };

  const fatigueData = records.reduce((acc, r) => {
    const key = `${r.date}-${r.team_id}`;
    if (!acc[key]) acc[key] = { date: r.date, team_id: r.team_id, total: 0, count: 0 };
    acc[key].total += Number(r.fatigue);
    acc[key].count += 1;
    return acc;
  }, {});
  const avgFatigue = Object.values(fatigueData).map((r) => ({
    date: r.date,
    team_id: r.team_id,
    avg: (r.total / r.count).toFixed(2),
  }));

  const practiceData = practiceTimes.map((pt) => ({
    date: pt.date,
    team_id: pt.team_id,
    minutes: pt.practice_minutes,
  }));

  return (
    <main className="p-6 max-w-6xl mx-auto text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold text-teal-600 mb-4">全体管理者画面</h1>

      {/* チーム管理 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">📁 チーム管理</h2>
        <div className="flex gap-2 mb-2">
          <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="新しいチーム名"
            className="border p-2 rounded"
          />
          <button onClick={handleAddTeam} className="bg-teal-600 text-white px-4 rounded">
            追加
          </button>
        </div>
        <ul>
          {teams.map((team) => (
            <li key={team.id} className="flex justify-between border-b py-1">
              {team.name}
              <button onClick={() => handleDeleteTeam(team.id)} className="text-red-500 text-sm">
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ユーザー管理 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">👤 ユーザー管理</h2>
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="border px-2 py-1">メール</th>
              <th className="border px-2 py-1">名前</th>
              <th className="border px-2 py-1">ロール</th>
              <th className="border px-2 py-1">チーム</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border px-2 py-1">{u.email}</td>
                <td className="border px-2 py-1">{u.nickname}</td>
                <td className="border px-2 py-1">
                  <select
                    value={u.role}
                    onChange={(e) => handleUserUpdate(u.id, u.team_id, e.target.value)}
                    className="border p-1 rounded"
                  >
                    {["admin", "staff", "athlete"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="border px-2 py-1">
                  <select
                    value={u.team_id || ""}
                    onChange={(e) => handleUserUpdate(u.id, Number(e.target.value), u.role)}
                    className="border p-1 rounded"
                  >
                    <option value="">未設定</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* チーム別疲労度グラフ */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">📊 チーム別平均疲労度</h2>
        <div className="h-60 overflow-x-auto">
          <ResponsiveContainer width={800} height="100%">
            <LineChart data={avgFatigue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              {[...new Set(avgFatigue.map((d) => d.team_id))].map((team, idx) => (
                <Line
                  key={team}
                  type="monotone"
                  dataKey={(d) => (d.team_id === team ? Number(d.avg) : null)}
                  name={`Team ${team}`}
                  stroke={`hsl(${idx * 60}, 70%, 50%)`}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* チーム別練習時間 */}
      <section>
        <h2 className="text-lg font-semibold mb-2">⏱ チーム別 練習時間</h2>
        <div className="h-60 overflow-x-auto">
          <ResponsiveContainer width={800} height="100%">
            <LineChart data={practiceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {[...new Set(practiceData.map((d) => d.team_id))].map((team, idx) => (
                <Line
                  key={team}
                  type="monotone"
                  dataKey={(d) => (d.team_id === team ? d.minutes : null)}
                  name={`Team ${team}`}
                  stroke={`hsl(${(idx * 60 + 30) % 360}, 60%, 50%)`}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}
