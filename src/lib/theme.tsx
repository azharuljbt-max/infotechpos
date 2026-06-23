import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const ThemeCtx = createContext<{ theme: Theme; resolved: Resolved; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "system",
  resolved: "dark",
  toggle: () => {},
  setTheme: () => {},
});

function systemPref(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<Resolved>("dark");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const initial: Theme = stored ?? "system";
    setThemeState(initial);
    const r = initial === "system" ? systemPref() : initial;
    setResolved(r);
    document.documentElement.classList.toggle("dark", r === "dark");
  }, []);

  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r: Resolved = mq.matches ? "dark" : "light";
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    const r = t === "system" ? systemPref() : t;
    setResolved(r);
    document.documentElement.classList.toggle("dark", r === "dark");
    localStorage.setItem("theme", t);
  };

  const toggle = () => setTheme(resolved === "dark" ? "light" : "dark");

  return <ThemeCtx.Provider value={{ theme, resolved, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
