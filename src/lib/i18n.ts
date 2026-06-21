import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "bn";

const DICT: Record<string, { en: string; bn: string }> = {
  // Nav groups
  "Overview": { en: "Overview", bn: "ওভারভিউ" },
  "Inventory": { en: "Inventory", bn: "ইনভেন্টরি" },
  "Operations": { en: "Operations", bn: "অপারেশন" },
  "Contacts": { en: "Contacts", bn: "কন্টাক্ট" },
  "Insights": { en: "Insights", bn: "ইনসাইট" },
  "System": { en: "System", bn: "সিস্টেম" },

  // Nav items
  "Dashboard": { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  "POS": { en: "POS", bn: "পিওএস" },
  "Products": { en: "Products", bn: "প্রোডাক্ট" },
  "Stock": { en: "Stock", bn: "স্টক" },
  "Warehouses": { en: "Warehouses", bn: "ওয়্যারহাউস" },
  "Sales": { en: "Sales", bn: "বিক্রয়" },
  "Purchases": { en: "Purchases", bn: "ক্রয়" },
  "Invoices": { en: "Invoices", bn: "ইনভয়েস" },
  "Quotations": { en: "Quotations", bn: "কোটেশন" },
  "Expenses": { en: "Expenses", bn: "খরচ" },
  "Customers": { en: "Customers", bn: "কাস্টমার" },
  "Suppliers": { en: "Suppliers", bn: "সাপ্লায়ার" },
  "Reports": { en: "Reports", bn: "রিপোর্ট" },
  "Accounting": { en: "Accounting", bn: "অ্যাকাউন্টিং" },
  "Audit Log": { en: "Audit Log", bn: "অডিট লগ" },
  "Team & Roles": { en: "Team & Roles", bn: "টিম ও রোল" },
  "Notifications": { en: "Notifications", bn: "নোটিফিকেশন" },
  "Settings": { en: "Settings", bn: "সেটিংস" },
  "Companies": { en: "Companies", bn: "কোম্পানি" },

  // Topbar / common
  "Search products, invoices, customers…": {
    en: "Search products, invoices, customers…",
    bn: "প্রোডাক্ট, ইনভয়েস, কাস্টমার খুঁজুন…",
  },
  "My account": { en: "My account", bn: "আমার অ্যাকাউন্ট" },
  "Sign out": { en: "Sign out", bn: "সাইন আউট" },
  "Trial · 14 days left": { en: "Trial · 14 days left", bn: "ট্রায়াল · ১৪ দিন বাকি" },

  // Page headers
  "Sales orders, invoices, returns, and analytics.": {
    en: "View, filter and manage all completed sales from POS.",
    bn: "POS থেকে সব সম্পন্ন বিক্রয় দেখুন, ফিল্টার ও পরিচালনা করুন।",
  },
  "Manage stock locations, branches and storage points.": {
    en: "Manage stock locations, branches and storage points.",
    bn: "স্টক লোকেশন, শাখা ও স্টোরেজ পয়েন্ট পরিচালনা করুন।",
  },
  "Record stock-in from suppliers — automatically updates product stock.": {
    en: "Record stock-in from suppliers — automatically updates product stock.",
    bn: "সাপ্লায়ার থেকে স্টক-ইন রেকর্ড করুন — প্রোডাক্ট স্টক স্বয়ংক্রিয়ভাবে আপডেট হবে।",
  },

  // Common buttons
  "New sale (POS)": { en: "New sale (POS)", bn: "নতুন বিক্রয় (POS)" },
  "New purchase": { en: "New purchase", bn: "নতুন ক্রয়" },
  "New warehouse": { en: "New warehouse", bn: "নতুন ওয়্যারহাউস" },
  "Cancel": { en: "Cancel", bn: "বাতিল" },
  "Save": { en: "Save", bn: "সংরক্ষণ" },
  "Saving…": { en: "Saving…", bn: "সংরক্ষণ হচ্ছে…" },
  "Loading…": { en: "Loading…", bn: "লোড হচ্ছে…" },
};

export function useLang(): Lang {
  const { data } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("user_settings").select("language").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });
  return ((data?.language as Lang) ?? "en");
}

export function useT() {
  const lang = useLang();
  return (key: string) => DICT[key]?.[lang] ?? key;
}
