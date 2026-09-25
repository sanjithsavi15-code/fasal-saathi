import {
  Camera,
  Map as MapIcon,
  ClipboardList,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: "diagnose" | "map" | "logs" | "profile";
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: "diagnose", labelKey: "tabDiagnose", href: "/", icon: Camera },
  { id: "map", labelKey: "tabMap", href: "/map", icon: MapIcon },
  { id: "logs", labelKey: "tabLogs", href: "/logs", icon: ClipboardList },
  { id: "profile", labelKey: "tabProfile", href: "/profile", icon: UserRound },
];
