
-- Super admin table (global, separate from workspace user_roles)
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Security definer check
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id);
$$;

-- Only super admins can read the table
CREATE POLICY "super admins can read super_admins"
ON public.super_admins FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Seed the designated super admin (user already exists in auth.users)
INSERT INTO public.super_admins (user_id, email)
VALUES ('6afba479-5e2f-44e0-b929-284345ab55ef', 'azharul.jbt@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- Set the password for this user
UPDATE auth.users
SET encrypted_password = crypt('Azad12@#', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '6afba479-5e2f-44e0-b929-284345ab55ef';
