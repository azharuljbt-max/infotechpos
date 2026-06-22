import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrency() {
  const { data } = useQuery({
    queryKey: ["currency-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { symbol: "$", code: "USD", position: "before" as const, decimals: 2 };
      const { data } = await supabase
        .from("user_settings")
        .select("currency_symbol, currency_code, currency_position, decimal_places")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return {
        symbol: data?.currency_symbol ?? "$",
        code: data?.currency_code ?? "USD",
        position: ((data as any)?.currency_position ?? "before") as "before" | "after",
        decimals: Number((data as any)?.decimal_places ?? 2),
      };
    },
    staleTime: 30_000,
  });
  const symbol = data?.symbol ?? "$";
  const code = data?.code ?? "USD";
  const position = data?.position ?? "before";
  const decimals = data?.decimals ?? 2;
  const fmt = (n: number | string | null | undefined, digits = decimals) => {
    const v = Number(n || 0).toFixed(digits);
    return position === "before" ? `${symbol}${v}` : `${v}${symbol}`;
  };
  return { symbol, code, position, decimals, fmt };
}
