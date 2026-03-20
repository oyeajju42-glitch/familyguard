import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function ScreenTimePage() {
  const { token } = useAuth();
  const { selectedDevice } = useOutletContext();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!selectedDevice?.id) return;
    api
      .get(`/api/parent/devices/${selectedDevice.id}/screen-time?limit=14`, authHeaders(token))
      .then((response) => setLogs(response.data.logs || []))
      .catch(() => setLogs([]));
  }, [selectedDevice?.id, token]);

  const chartData = useMemo(() => logs.map((log) => ({ date: log.date.slice(5), minutes: log.totalMinutes })).reverse(), [logs]);
  const latest = logs[0];

  return (
    <section className="space-y-6" data-testid="screen-time-page">
      <article className="card-surface p-6" data-testid="screen-time-chart-card">
        <h3 className="text-2xl font-bold">Screen Time Analytics</h3>
        <p className="mt-1 text-sm text-slate-500">Daily total minutes used across monitored apps.</p>
        <div className="mt-5 h-72" data-testid="screen-time-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#475569" />
              <YAxis stroke="#475569" />
              <Tooltip />
              <Bar dataKey="minutes" fill="#0f172a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="card-surface p-6" data-testid="screen-time-breakdown-card">
        <h4 className="text-lg font-semibold">Latest App Breakdown</h4>
        <p className="text-sm text-slate-500" data-testid="screen-time-latest-date">
          {latest?.date ? `Date: ${latest.date}` : "No latest data"}
        </p>
        <div className="mt-4 space-y-3">
          {(latest?.appBreakdown || []).map((app, index) => (
            <div key={`${app.packageName}-${index}`} className="rounded-xl border border-slate-200 p-3" data-testid={`screen-time-breakdown-${index}`}>
              <p className="font-semibold" data-testid={`screen-time-breakdown-name-${index}`}>
                {app.packageName}
              </p>
              <p className="text-sm text-slate-600" data-testid={`screen-time-breakdown-minutes-${index}`}>
                {app.minutes} minutes
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
