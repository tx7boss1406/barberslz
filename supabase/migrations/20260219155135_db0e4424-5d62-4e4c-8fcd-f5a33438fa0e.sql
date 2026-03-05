
-- Enum for reservation status
CREATE TYPE public.reservation_status AS ENUM ('pendente', 'confirmado', 'cancelado', 'concluido');

-- Barbeiros table
CREATE TABLE public.barbeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  especialidade TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  foto_url TEXT DEFAULT '',
  status BOOLEAN NOT NULL DEFAULT true,
  avaliacao NUMERIC(2,1) DEFAULT 4.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active barbers"
  ON public.barbeiros FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage barbers"
  ON public.barbeiros FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Servicos table
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  duracao INTEGER NOT NULL DEFAULT 30,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON public.servicos FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage services"
  ON public.servicos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Reservas table
CREATE TABLE public.reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  barbeiro_id UUID NOT NULL REFERENCES public.barbeiros(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reservations"
  ON public.reservas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view reservations"
  ON public.reservas FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage reservations"
  ON public.reservas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete reservations"
  ON public.reservas FOR DELETE
  TO authenticated
  USING (true);

-- Configuracoes table
CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_abertura TIME NOT NULL DEFAULT '09:00',
  horario_fechamento TIME NOT NULL DEFAULT '20:00',
  intervalo_minutos INTEGER NOT NULL DEFAULT 30,
  max_agendamentos_simultaneos INTEGER NOT NULL DEFAULT 1,
  mensagem_pos_reserva TEXT DEFAULT 'Obrigado pela sua reserva! Aguarde a confirmação.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON public.configuracoes FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.configuracoes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default config
INSERT INTO public.configuracoes (horario_abertura, horario_fechamento, intervalo_minutos) 
VALUES ('09:00', '20:00', 30);

-- Insert default barbers
INSERT INTO public.barbeiros (nome, especialidade, bio, avaliacao) VALUES
('Carlos Figaro', 'Fade e Navalhado', 'Especialista em cortes modernos com mais de 10 anos de experiência.', 4.8),
('Rafael Mendes', 'Corte Clássico e Barba', 'Mestre em técnicas tradicionais de barbearia.', 4.9),
('Diego Costa', 'Degradê e Coloração', 'Artista capilar com foco em tendências internacionais.', 4.7);

-- Insert default services
INSERT INTO public.servicos (nome, descricao, duracao, preco) VALUES
('Corte Clássico', 'Corte tradicional com acabamento impecável', 40, 50.00),
('Barba Completa', 'Modelagem e hidratação completa da barba', 30, 40.00),
('Corte + Barba', 'Combo completo de corte e barba', 60, 80.00),
('Fade Americano', 'Degradê preciso com técnicas modernas', 45, 60.00),
('Navalhado', 'Acabamento refinado com navalha', 25, 35.00),
('Sobrancelha', 'Design e limpeza profissional', 15, 20.00);

-- Enable realtime for reservas
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
