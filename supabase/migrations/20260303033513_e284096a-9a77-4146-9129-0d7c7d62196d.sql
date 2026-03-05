
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS meta_mensal numeric DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS dias_ativos jsonb DEFAULT '["seg","ter","qua","qui","sex","sab"]'::jsonb,
  ADD COLUMN IF NOT EXISTS push_admin_ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS lembrete_24h boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS lembrete_2h boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS nome_barbearia text DEFAULT 'Barber Club & Tattoo',
  ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT '98982415349',
  ADD COLUMN IF NOT EXISTS instagram text DEFAULT 'juniorr_barber_',
  ADD COLUMN IF NOT EXISTS endereco_url text DEFAULT 'https://www.google.com/maps/place/Yeshua+Presentes+Personalizados';
