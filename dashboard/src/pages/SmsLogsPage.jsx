import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SmsLogsPage() {
  const { token } = useAuth();
  const { selectedDevice } = useOutletContext();
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    if (!selectedDevice?.id) return;
    api
      .get(`/api/parent/devices/${selectedDevice.id}/sms?limit=3`, authHeaders(token))
      .then((response) => setSnapshots(response.data.snapshots || []))
      .catch(() => setSnapshots([]));
  }, [selectedDevice?.id, token]);

  const messages = useMemo(() => snapshots.flatMap((item) => item.messages || []), [snapshots]);

  return (
    <section className="space-y-6" data-testid="sms-logs-page">
      <article className="card-surface p-6" data-testid="sms-summary-card">
        <h3 className="text-2xl font-bold">SMS Logs</h3>
        <p className="mt-1 text-sm text-slate-500">Most recent synced message snapshots.</p>
        <p className="mt-4 text-4xl font-bold" data-testid="sms-total-count">
          {messages.length}
        </p>
      </article>

      <article className="card-surface overflow-x-auto p-6" data-testid="sms-table-card">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2">Address</th>
              <th className="pb-2">Body</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((sms, index) => (
              <tr key={`${sms.address}-${index}`} className="border-b border-slate-100" data-testid={`sms-row-${index}`}>
                <td className="py-3" data-testid={`sms-address-${index}`}>
                  {sms.address}
                </td>
                <td className="py-3" data-testid={`sms-body-${index}`}>
                  {sms.body}
                </td>
                <td className="py-3" data-testid={`sms-type-${index}`}>
                  {sms.type}
                </td>
                <td className="py-3" data-testid={`sms-time-${index}`}>
                  {sms.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
