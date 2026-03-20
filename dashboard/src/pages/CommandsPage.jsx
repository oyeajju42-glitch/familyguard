import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Command, LoaderCircle } from "lucide-react";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../lib/socket";

const commandButtons = [
  { key: "ping", label: "Ping Device" },
  { key: "lock-screen-intent", label: "Lock Screen Intent" },
  { key: "request-location-now", label: "Request Location Now" },
  { key: "request-sync-now", label: "Request Sync Now" },
];

export default function CommandsPage() {
  const { token } = useAuth();
  const { selectedDevice } = useOutletContext();
  const [commands, setCommands] = useState([]);
  const [loadingKey, setLoadingKey] = useState("");

  const load = async () => {
    if (!selectedDevice?.id) return;
    const response = await api.get(`/api/parent/devices/${selectedDevice.id}/commands?limit=20`, authHeaders(token));
    setCommands(response.data.commands || []);
  };

  useEffect(() => {
    load().catch(() => setCommands([]));
  }, [selectedDevice?.id, token]);

  useEffect(() => {
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on("command:created", (payload) => setCommands((prev) => [payload, ...prev]));
    socket.on("command:ack", (payload) => {
      setCommands((prev) => prev.map((cmd) => (cmd.id === payload.commandId ? { ...cmd, ...payload } : cmd)));
    });
    return () => {
      socket.off("command:created");
      socket.off("command:ack");
    };
  }, [token]);

  const sendCommand = async (commandType) => {
    if (!selectedDevice?.id) return;
    setLoadingKey(commandType);
    try {
      await api.post(
        `/api/parent/devices/${selectedDevice.id}/commands`,
        { commandType, payload: {} },
        authHeaders(token),
      );
      await load();
    } finally {
      setLoadingKey("");
    }
  };

  return (
    <section className="space-y-6" data-testid="commands-page">
      <article className="card-surface p-6" data-testid="commands-actions-card">
        <h3 className="text-2xl font-bold">Remote Commands</h3>
        <p className="mt-1 text-sm text-slate-500">Send actions to the child device securely.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {commandButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => sendCommand(button.key)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-slate-800 disabled:opacity-60"
              disabled={loadingKey === button.key}
              data-testid={`command-button-${button.key}`}
            >
              {loadingKey === button.key ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Command className="h-4 w-4" strokeWidth={1.5} />
              )}
              {button.label}
            </button>
          ))}
        </div>
      </article>

      <article className="card-surface overflow-x-auto p-6" data-testid="commands-history-table-card">
        <h4 className="mb-3 text-lg font-semibold">Command History</h4>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2">Command</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Requested</th>
              <th className="pb-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {commands.map((item, index) => (
              <tr key={`${item.id}-${index}`} className="border-b border-slate-100" data-testid={`command-row-${index}`}>
                <td className="py-3 font-medium" data-testid={`command-type-${index}`}>
                  {item.commandType}
                </td>
                <td className="py-3" data-testid={`command-status-${index}`}>
                  {item.status}
                </td>
                <td className="py-3" data-testid={`command-requested-at-${index}`}>
                  {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : "-"}
                </td>
                <td className="py-3" data-testid={`command-result-${index}`}>
                  {item.resultMessage || "Pending"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
