import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrency() {
  const { data } = useQuery({
    queryKey: ["currency-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { symbol: "$", code: "USD" };
      const { data } = await supabase
        .from("user_settings")
        .select("currency_symbol, currency_code")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return {
        symbol: data?.currency_symbol ?? "$",
        code: data?.currency_code ?? "USD",
      };
    },
    staleTime: 30_000,
  });
  const symbol = data?.symbol ?? "$";
  const code = data?.code ?? "USD";
  const fmt = (n: number | string | null | undefined, digits = 2) =>
    `${symbol}${Number(n || 0).toFixed(digits)}`;
  return { symbol, code, fmt };
}
