import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, Clock3, Command, MapPin, Smartphone } from "lucide-react";
import { api, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../lib/socket";

const avatarUrl = "https://images.unsplash.com/photo-1759502720181-9a93873ba0d5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHw0fHxoYXBweSUyMGNoaWxkJTIwcG9ydHJhaXQlMjBuYXR1cmFsJTIwbGlnaHR8ZW58MHx8fHwxNzczNjYxMTIxfDA&ixlib=rb-4.1.0&q=85";

const MetricCard = ({ icon: Icon, label, value, testId }) => (
  <article className="card-surface p-5 bg-white rounded-2xl shadow-sm border border-slate-100" data-testid={`${testId}-card`}>
    <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-2 text-primary">
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </div>
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-bold">{value}</p>
  </article>
);

export default function DashboardHome() {
  const { token } = useAuth();
  // Layout.jsx se devices aur selectedDevice dono le rahe hain
  const { selectedDevice, devices } = useOutletContext(); 
  const [stats, setStats] = useState({ notificationLogs: 0, pendingCommands: 0 });
  const [location, setLocation] = useState(null);
  const [screenTime, setScreenTime] = useState([]);

  const loadData = async () => {
    try {
      // Stats API call
      const overview = await api.get("/api/parent/overview", authHeaders(token));
      setStats(prev => ({ ...prev, ...overview.data.stats }));

      // Fix: Layout.jsx 'deviceId' use kar raha hai, 'id' nahi
      if (!selectedDevice?.deviceId) return;

      const [locationRes, screenRes] = await Promise.all([
        api.get(`/api/parent/devices/${selectedDevice.deviceId}/locations?limit=1`, authHeaders(token)),
        api.get(`/api/parent/devices/${selectedDevice.deviceId}/screen-time?limit=7`, authHeaders(token)),
      ]);

      setLocation(locationRes.data.logs?.[0] || locationRes.data[0] || null);
      const chartRows = (screenRes.data.logs || []).map((row) => ({ 
        day: row.date.slice(5), 
        minutes: row.totalMinutes 
      })).reverse();
      setScreenTime(chartRows);
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, selectedDevice?.deviceId]);

  useEffect(() => {
    const socket = connectSocket(token);
    if (!socket) return;
    
    socket.on("device:location", (payload) => setLocation(payload));
    socket.on("device:notification", () => setStats(prev => ({ ...prev, notificationLogs: (prev.notificationLogs || 0) + 1 })));

    return () => {
      socket.off("device:location");
      socket.off("device:notification");
    };
  }, [token, selectedDevice?.deviceId]);

  // Undefined fix: childName aur deviceLabel ka use
  const statusText = useMemo(() => {
    if (!selectedDevice) return "No device selected";
    return `${selectedDevice.childName} • ${selectedDevice.deviceLabel || 'Active'}`;
  }, [selectedDevice]);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-12">
        <article className="card-surface xl:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="p-6">
            <img src={avatarUrl} alt="Child" className="absolute right-0 top-0 h-full w-40 object-cover opacity-10 pointer-events-none" />
            <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">Monitored Device</p>
            <h3 className="mt-2 text-3xl font-bold text-slate-800">{statusText}</h3>
            
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Latest Location</p>
              <p className="mt-2 text-xl font-semibold text-slate-700">
                {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "Waiting for device update..."}
              </p>
            </div>
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
          {/* Dynamic devices count from Layout.jsx */}
          <MetricCard icon={Smartphone} label="Devices" value={devices?.length || 0} testId="metric-devices" />
          <MetricCard icon={Bell} label="Notifications" value={stats.notificationLogs || 0} testId="metric-notifications" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <article className="card-surface p-6 lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-slate-800">Screen Time Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={screenTime}>
                <defs>
                  <linearGradient id="screenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="minutes" stroke="#6366f1" fill="url(#screenGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card-surface p-6 lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xl font-bold text-slate-800">Quick Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Real-time location active</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Clock3 className="h-4 w-4 text-primary" />
              <span>Analytics synced daily</span>
            </div>
          </div>
          <button 
            onClick={loadData}
            className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all active:scale-95"
          >
            Refresh Overview
          </button>
        </article>
      </div>
    </section>
  );
}
