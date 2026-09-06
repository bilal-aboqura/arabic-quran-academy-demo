declare module "lucide-react" {
  import * as React from "react";

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    className?: string;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const ChevronDown: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const LogOut: LucideIcon;
  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Folder: LucideIcon;
  export const Clock: LucideIcon;
  export const Star: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Search: LucideIcon;
  export const SearchX: LucideIcon;
  export const Play: LucideIcon;
  export const PlayCircle: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Award: LucideIcon;
  export const Lock: LucideIcon;
  export const Sparkles: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const FileText: LucideIcon;
  export const FileCheck: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Key: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Radio: LucideIcon;
  export const Wallet: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const Globe: LucideIcon;
  export const Settings: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Calendar: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Mail: LucideIcon;
  export const Phone: LucideIcon;
  export const Check: LucideIcon;
  export const Rocket: LucideIcon;
  export const Video: LucideIcon;
  export const Moon: LucideIcon;
  export const Sun: LucideIcon;
}
