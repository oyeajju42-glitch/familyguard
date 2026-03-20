import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { MapPin } from "lucide-react";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../lib/socket";

export default function LiveLocationPage() {
  const { token } = useAuth();
  const { selectedDevice } = useOutletContext();
  const [locations, setLocations] = useState([]);

  const loadLocations = async () => {
    if (!selectedDevice?.id) return;
    const response = await api.get(`/api/parent/devices/${selectedDevice.id}/locations?limit=20`, authHeaders(token));
    setLocations(response.data.logs || []);
  };

  useEffect(() => {
    loadLocations().catch(() => setLocations([]));
  }, [selectedDevice?.id]);

  useEffect(() => {
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on("device:location", (payload) => {
      setLocations((prev) => [payload, ...prev].slice(0, 20));
    });
    return () => socket.off("device:location");
  }, [token]);

  const latest = locations[0];

  return (
    <section className="space-y-6" data-testid="live-location-page">
      <article className="card-surface p-6" data-testid="live-location-hero-card">
        <h3 className="text-2xl font-bold">Live Location</h3>
        <p className="mt-1 text-sm text-slate-500">Most recent coordinates from child device</p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5" data-testid="latest-location-panel">
          <p className="text-sm text-slate-500">Latest Pin</p>
          <p className="mt-2 text-xl font-semibold" data-testid="latest-location-coordinates">
            {latest ? `${latest.latitude?.toFixed(5)} , ${latest.longitude?.toFixed(5)}` : "No location yet"}
          </p>
        </div>
      </article>

      <article className="card-surface overflow-x-auto p-6" data-testid="location-history-table-card">
        <h4 className="mb-4 text-lg font-semibold">Location History</h4>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2">Coordinates</th>
              <th className="pb-2">Accuracy</th>
              <th className="pb-2">Battery</th>
              <th className="pb-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((item, index) => (
              <tr key={`${item.id || "row"}-${index}`} className="border-b border-slate-100" data-testid={`location-row-${index}`}>
                <td className="py-3 font-medium">
                  <MapPin className="mr-1 inline h-4 w-4 text-accent" strokeWidth={1.5} />
                  {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
                </td>
                <td className="py-3" data-testid={`location-accuracy-${index}`}>
                  {item.accuracyMeters ?? "-"} m
                </td>
                <td className="py-3" data-testid={`location-battery-${index}`}>
                  {item.batteryLevel ?? "-"}%
                </td>
                <td className="py-3" data-testid={`location-time-${index}`}>
                  {item.recordedAt ? new Date(item.recordedAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
