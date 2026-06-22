-- SaaS plans
CREATE TABLE public.saas_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  trial_days integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_plans TO authenticated;
GRANT ALL ON public.saas_plans TO service_role;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages plans" ON public.saas_plans
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_saas_plans_updated BEFORE UPDATE ON public.saas_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subscriptions
CREATE TABLE public.saas_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'trial',
  started_at date NOT NULL DEFAULT (now()::date),
  current_period_start date,
  current_period_end date,
  trial_ends_at date,
  cancel_at date,
  canceled_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_saas_subs_company ON public.saas_subscriptions(company_id);
CREATE INDEX idx_saas_subs_owner_status ON public.saas_subscriptions(owner_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_subscriptions TO authenticated;
GRANT ALL ON public.saas_subscriptions TO service_role;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages subscriptions" ON public.saas_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_saas_subs_updated BEFORE UPDATE ON public.saas_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments (manual bKash/Nagad/etc.)
CREATE TABLE public.saas_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.saas_subscriptions(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  method text NOT NULL DEFAULT 'bkash',
  txn_id text,
  payer_msisdn text,
  paid_at date NOT NULL DEFAULT (now()::date),
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'verified',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_saas_payments_company ON public.saas_payments(company_id);
CREATE INDEX idx_saas_payments_owner_paid ON public.saas_payments(owner_id, paid_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_payments TO authenticated;
GRANT ALL ON public.saas_payments TO service_role;
ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages payments" ON public.saas_payments
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_saas_payments_updated BEFORE UPDATE ON public.saas_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();