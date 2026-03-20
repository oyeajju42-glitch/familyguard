import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../lib/socket";

export default function NotificationsPage() {
  const { token } = useAuth();
  const { selectedDevice } = useOutletContext();
  const [logs, setLogs] = useState([]);

  const load = async () => {
    if (!selectedDevice?.id) return;
    const response = await api.get(`/api/parent/devices/${selectedDevice.id}/notifications?limit=30`, authHeaders(token));
    setLogs(response.data.logs || []);
  };

  useEffect(() => {
    load().catch(() => setLogs([]));
  }, [selectedDevice?.id, token]);

  useEffect(() => {
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on("device:notification", (payload) => {
      setLogs((prev) => [payload, ...prev].slice(0, 30));
    });
    return () => socket.off("device:notification");
  }, [token]);

  return (
    <section className="space-y-4" data-testid="notifications-page">
      {logs.map((log, index) => (
        <article
          key={`${log.id || log.title}-${index}`}
          className="card-surface flex items-start gap-3 p-4"
          data-testid={`notification-item-${index}`}
        >
          <div className="rounded-full bg-emerald-50 p-2 text-emerald-700">
            <Bell className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-semibold" data-testid={`notification-title-${index}`}>
              {log.title}
            </p>
            <p className="text-sm text-slate-600" data-testid={`notification-text-${index}`}>
              {log.text || "No detail"}
            </p>
            <p className="mt-1 text-xs text-slate-500" data-testid={`notification-meta-${index}`}>
              {log.appName} • {log.postedAt ? new Date(log.postedAt).toLocaleString() : "-"}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
