import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function InstalledAppsPage() {
  const { token } = useAuth();
  const { selectedDevice } = useOutletContext();
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    if (!selectedDevice?.id) return;
    api
      .get(`/api/parent/devices/${selectedDevice.id}/installed-apps?limit=1`, authHeaders(token))
      .then((response) => setSnapshots(response.data.snapshots || []))
      .catch(() => setSnapshots([]));
  }, [selectedDevice?.id, token]);

  const latestApps = useMemo(() => snapshots[0]?.apps || [], [snapshots]);

  return (
    <section className="space-y-6" data-testid="installed-apps-page">
      <article className="card-surface p-6" data-testid="installed-apps-summary-card">
        <h3 className="text-2xl font-bold">Installed Apps</h3>
        <p className="mt-1 text-sm text-slate-500" data-testid="installed-apps-captured-at">
          {snapshots[0]?.capturedAt ? `Captured: ${new Date(snapshots[0].capturedAt).toLocaleString()}` : "No snapshot captured yet."}
        </p>
        <p className="mt-4 text-4xl font-bold" data-testid="installed-apps-total-count">
          {latestApps.length}
        </p>
      </article>

      <article className="card-surface overflow-x-auto p-6" data-testid="installed-apps-table-card">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2">App Name</th>
              <th className="pb-2">Package</th>
              <th className="pb-2">Version</th>
              <th className="pb-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {latestApps.map((app, index) => (
              <tr key={`${app.packageName}-${index}`} className="border-b border-slate-100" data-testid={`installed-app-row-${index}`}>
                <td className="py-3 font-medium" data-testid={`installed-app-name-${index}`}>
                  {app.appName}
                </td>
                <td className="py-3" data-testid={`installed-app-package-${index}`}>
                  {app.packageName}
                </td>
                <td className="py-3" data-testid={`installed-app-version-${index}`}>
                  {app.versionName || "-"}
                </td>
                <td className="py-3" data-testid={`installed-app-type-${index}`}>
                  {app.systemApp ? "System" : "User"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
