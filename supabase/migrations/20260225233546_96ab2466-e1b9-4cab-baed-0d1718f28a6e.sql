
-- 1. Create profiles table for client users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome text NOT NULL DEFAULT '',
  telefone text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add optional user_id to reservas
ALTER TABLE public.reservas ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- 3. FIX RLS POLICIES - All policies were RESTRICTIVE (Permissive: No), 
-- which blocks ALL access since restrictive policies only narrow permissive ones.
-- Drop all restrictive policies and recreate as permissive.

-- barbeiros
DROP POLICY IF EXISTS "Anyone can view active barbers" ON public.barbeiros;
DROP POLICY IF EXISTS "Admins can insert barbers" ON public.barbeiros;
DROP POLICY IF EXISTS "Admins can update barbers" ON public.barbeiros;
DROP POLICY IF EXISTS "Admins can delete barbers" ON public.barbeiros;

CREATE POLICY "Anyone can view barbers" ON public.barbeiros FOR SELECT USING (true);
CREATE POLICY "Admins manage barbers insert" ON public.barbeiros FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage barbers update" ON public.barbeiros FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage barbers delete" ON public.barbeiros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- servicos
DROP POLICY IF EXISTS "Anyone can view active services" ON public.servicos;
DROP POLICY IF EXISTS "Admins can insert services" ON public.servicos;
DROP POLICY IF EXISTS "Admins can update services" ON public.servicos;
DROP POLICY IF EXISTS "Admins can delete services" ON public.servicos;

CREATE POLICY "Anyone can view services" ON public.servicos FOR SELECT USING (true);
CREATE POLICY "Admins manage services insert" ON public.servicos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage services update" ON public.servicos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage services delete" ON public.servicos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- reservas
DROP POLICY IF EXISTS "Anyone can view reservations" ON public.reservas;
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservas;
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservas;
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservas;

CREATE POLICY "Anyone can view reservations" ON public.reservas FOR SELECT USING (true);
CREATE POLICY "Authenticated can create reservations" ON public.reservas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage reservations update" ON public.reservas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage reservations delete" ON public.reservas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- configuracoes
DROP POLICY IF EXISTS "Anyone can view settings" ON public.configuracoes;
DROP POLICY IF EXISTS "Admins can update settings" ON public.configuracoes;

CREATE POLICY "Anyone can view settings" ON public.configuracoes FOR SELECT USING (true);
CREATE POLICY "Admins manage settings update" ON public.configuracoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
