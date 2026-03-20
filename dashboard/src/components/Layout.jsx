import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Sidebar from "./Sidebar"; // Make sure path is correct

export default function Layout() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const loadDevices = async () => {
    try {
      const res = await api.get("/api/device/childdevices");
      const data = res.data || [];
      
      // Backend fields mapping
      const mapped = data.map((d) => ({
        deviceId: d._id,
        childName: d.childName || "Unknown Child",
        deviceLabel: d.deviceLabel || d.model || "Unknown Device",
      }));

      setDevices(mapped);

      if (mapped.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(mapped[0].deviceId);
      }
    } catch (e) {
      console.error("Error loading devices:", e);
      setDevices([]);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId) || null;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Devices</p>
            <select
              className="mt-1 block w-full rounded-md border-slate-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none sm:text-sm"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.length === 0 ? (
                <option>No devices enrolled</option>
              ) : (
                devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.childName} ({d.deviceLabel})
                  </option>
                ))
              )}
            </select>
          </div>
          
          {selectedDevice && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Selected Device ID</p>
              <p className="text-sm font-mono font-bold text-primary">{selectedDevice.deviceId}</p>
            </div>
          )}
        </div>

        <hr className="my-6 border-slate-200" />

        {/* Passing devices and selectedDevice to all child routes */}
        <Outlet context={{ selectedDevice, devices }} />
      </main>
    </div>
  );
}
