
-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('pending_payment', 'active', 'expired', 'canceled');

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM ('awaiting_payment', 'paid', 'failed');

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'monthly_premium',
  price INTEGER NOT NULL DEFAULT 15000,
  credits_total INTEGER NOT NULL DEFAULT 5,
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_available INTEGER NOT NULL DEFAULT 5,
  status public.subscription_status NOT NULL DEFAULT 'pending_payment',
  start_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  payment_status public.payment_status NOT NULL DEFAULT 'awaiting_payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription payments table
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  payment_status public.payment_status NOT NULL DEFAULT 'awaiting_payment',
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by_admin UUID
);

-- Add PIX columns to configuracoes
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS pix_key TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_qr_image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_copy_paste_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS plano_preco INTEGER DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS plano_creditos INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS plano_nome TEXT DEFAULT 'Plano Premium Mensal';

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscription_payments_subscription_id ON public.subscription_payments(subscription_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Users can read own subscriptions
CREATE POLICY "Users read own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own subscriptions
CREATE POLICY "Users insert own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can read all subscriptions
CREATE POLICY "Admin read all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all subscriptions
CREATE POLICY "Admin update subscriptions" ON public.subscriptions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Users can read own payments
CREATE POLICY "Users read own payments" ON public.subscription_payments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own payments
CREATE POLICY "Users insert own payments" ON public.subscription_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin read all payments
CREATE POLICY "Admin read all payments" ON public.subscription_payments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin update payments
CREATE POLICY "Admin update payments" ON public.subscription_payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
