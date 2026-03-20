import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Activity } from "lucide-react";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../lib/socket";

export default function ActivityFeedPage() {
  const { token } = useAuth();
  const { selectedDevice } = useOutletContext();
  const [logs, setLogs] = useState([]);

  const load = async () => {
    if (!selectedDevice?.id) return;
    const response = await api.get(`/api/parent/devices/${selectedDevice.id}/activity?limit=40`, authHeaders(token));
    setLogs(response.data.logs || []);
  };

  useEffect(() => {
    load().catch(() => setLogs([]));
  }, [selectedDevice?.id, token]);

  useEffect(() => {
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on("device:activity", (payload) => {
      setLogs((prev) => [payload, ...prev].slice(0, 40));
    });
    return () => socket.off("device:activity");
  }, [token]);

  return (
    <section className="space-y-4" data-testid="activity-feed-page">
      {logs.map((log, index) => (
        <article key={`${log.id || log.title}-${index}`} className="card-surface p-4" data-testid={`activity-item-${index}`}>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-slate-100 p-2 text-primary">
              <Activity className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold" data-testid={`activity-title-${index}`}>
                {log.title}
              </p>
              <p className="text-sm text-slate-600" data-testid={`activity-description-${index}`}>
                {log.description}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500" data-testid={`activity-type-${index}`}>
                {log.eventType}
              </p>
              <p className="text-xs text-slate-500" data-testid={`activity-time-${index}`}>
                {log.occurredAt ? new Date(log.occurredAt).toLocaleString() : "-"}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
