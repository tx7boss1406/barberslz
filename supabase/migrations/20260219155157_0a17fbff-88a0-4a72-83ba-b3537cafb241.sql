
-- Create admin role check function
CREATE TYPE public.app_role AS ENUM ('admin', 'funcionario');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update barbeiros policies
DROP POLICY "Admins can manage barbers" ON public.barbeiros;
CREATE POLICY "Admins can insert barbers" ON public.barbeiros FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update barbers" ON public.barbeiros FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete barbers" ON public.barbeiros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update servicos policies
DROP POLICY "Admins can manage services" ON public.servicos;
CREATE POLICY "Admins can insert services" ON public.servicos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update services" ON public.servicos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete services" ON public.servicos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update reservas policies
DROP POLICY "Admins can manage reservations" ON public.reservas;
DROP POLICY "Admins can delete reservations" ON public.reservas;
CREATE POLICY "Admins can update reservations" ON public.reservas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reservations" ON public.reservas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update configuracoes policies
DROP POLICY "Admins can manage settings" ON public.configuracoes;
CREATE POLICY "Admins can update settings" ON public.configuracoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
