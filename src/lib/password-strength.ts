export type PasswordRule = {
  id: string;
  label: string;
  test: (pw: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "At least 10 characters", test: (p) => p.length >= 10 },
  { id: "upper", label: "An uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "A number (0-9)", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "A symbol (!@#$…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
  { id: "nospace", label: "No leading/trailing spaces", test: (p) => p.length > 0 && p === p.trim() },
];

export function evaluatePassword(pw: string) {
  const passed = PASSWORD_RULES.filter((r) => r.test(pw));
  const score = passed.length; // 0..6
  let label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong" = "Too weak";
  if (score >= 6) label = "Strong";
  else if (score >= 5) label = "Good";
  else if (score >= 4) label = "Fair";
  else if (score >= 2) label = "Weak";
  const valid = passed.length === PASSWORD_RULES.length;
  return { score, max: PASSWORD_RULES.length, label, valid, passed: new Set(passed.map((r) => r.id)) };
}
