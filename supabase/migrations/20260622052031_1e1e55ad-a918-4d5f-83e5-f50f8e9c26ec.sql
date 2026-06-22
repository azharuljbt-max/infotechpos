
-- Role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner','admin','manager','staff','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  email TEXT,
  full_name TEXT,
  role public.app_role NOT NULL DEFAULT 'staff',
  branch TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  two_factor_required BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer (recursion-safe)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _owner_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND owner_id = _owner_id AND role = _role AND is_active
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, UUID, public.app_role) TO authenticated, service_role;

-- Policies: workspace owner sees all their team rows; team members see rows for their workspace
CREATE POLICY "Owners and members read team"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = owner_id OR auth.uid() = user_id);

CREATE POLICY "Owner manages team"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner updates team"
ON public.user_roles FOR UPDATE TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner deletes team"
ON public.user_roles FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

CREATE TRIGGER trg_user_roles_updated
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invitations
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.app_role NOT NULL DEFAULT 'staff',
  branch TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages invitations"
ON public.team_invitations FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_team_invitations_updated
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
