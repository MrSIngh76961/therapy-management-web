import {
  Bell, BookOpen, Calendar, CalendarClock, ClipboardCheck, CreditCard, FileText, FolderOpen, Gauge, HeartHandshake, LayoutDashboard, MessageSquareHeart,
  ReceiptText, Settings, ShieldCheck, Stethoscope, UserCircle, Users, UsersRound, BarChart3, Wrench, Clock, Video, BellRing,
} from "lucide-react";
import type { Role } from "@/services/types";

export interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }>; section?: string }

export const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { href: "/admin/therapists", label: "Therapists", icon: Stethoscope, section: "Practice" },
    { href: "/admin/clients", label: "Clients", icon: Users },
    { href: "/admin/services", label: "Services", icon: Wrench },
    { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
    { href: "/admin/payments", label: "Payments", icon: CreditCard, section: "Finance" },
    { href: "/admin/invoices", label: "Invoices", icon: ReceiptText },
    { href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
    { href: "/admin/users", label: "Users & Permissions", icon: ShieldCheck, section: "Administration" },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/settings", label: "Clinic Settings", icon: Settings },
    { href: "/admin/profile", label: "My Profile", icon: UserCircle },
  ],
  therapist: [
    { href: "/therapist", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { href: "/therapist/clients", label: "My Clients", icon: Users, section: "Practice" },
    { href: "/therapist/sessions", label: "Sessions", icon: Video },
    { href: "/therapist/appointments", label: "Appointments", icon: CalendarClock },
    { href: "/therapist/working-hours", label: "Working Hours", icon: Clock },
    { href: "/therapist/consent", label: "DPDPA Consent", icon: ShieldCheck },
    { href: "/therapist/tasks", label: "Tasks", icon: ClipboardCheck, section: "Care" },
    { href: "/therapist/documents", label: "Documents", icon: FolderOpen },
    { href: "/therapist/feedback", label: "Feedback", icon: MessageSquareHeart },
    { href: "/therapist/reminders", label: "Reminders", icon: BellRing },
    { href: "/therapist/payments", label: "Payments", icon: CreditCard, section: "Account" },
    { href: "/therapist/notifications", label: "Notifications", icon: Bell },
    { href: "/therapist/profile", label: "Manage Profile", icon: UserCircle },
  ],
  client: [
    { href: "/client", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { href: "/client/therapists", label: "My Therapists", icon: HeartHandshake, section: "Care" },
    { href: "/client/sessions", label: "Sessions", icon: Video },
    { href: "/client/appointments", label: "Appointments", icon: Calendar },
    { href: "/client/tasks", label: "Tasks", icon: ClipboardCheck },
    { href: "/client/documents", label: "Documents", icon: FileText },
    { href: "/client/feedback", label: "Feedback", icon: MessageSquareHeart },
    { href: "/client/payments", label: "Payments & Receipts", icon: CreditCard, section: "Account" },
    { href: "/client/consent", label: "DPDPA Consent", icon: ShieldCheck },
    { href: "/client/notifications", label: "Notifications", icon: Bell },
    { href: "/client/profile", label: "Manage Profile", icon: UserCircle },
  ],
};
export const roleLabel: Record<Role, string> = { admin: "Clinic Owner", therapist: "Therapist", client: "Client" };
export { BookOpen, Gauge, UsersRound };
