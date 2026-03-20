import { NavLink } from "react-router-dom";
import {
  Activity,
  Bell,
  Command,
  Home,
  List,
  MapPin,
  MessageSquare,
  Smartphone,
  Timer,
} from "lucide-react";

const links = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/location", label: "Live Location", icon: MapPin },
  { to: "/screen-time", label: "Screen Time", icon: Timer },
  { to: "/installed-apps", label: "Installed Apps", icon: List },
  { to: "/sms", label: "SMS Logs", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/activity", label: "Activity Feed", icon: Activity },
  { to: "/commands", label: "Remote Commands", icon: Command },
];

export default function Sidebar() {
  return (
    <aside className="w-full border-r border-slate-200 bg-white/80 px-4 py-6 backdrop-blur lg:h-screen lg:w-72">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="rounded-xl bg-primary p-2 text-white">
          <Smartphone className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm text-slate-500" data-testid="sidebar-brand-caption">
            Family monitoring
          </p>
          <h1 className="text-xl font-bold" data-testid="sidebar-brand-title">
            FamilyGuard
          </h1>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 lg:flex-col" data-testid="sidebar-navigation">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
