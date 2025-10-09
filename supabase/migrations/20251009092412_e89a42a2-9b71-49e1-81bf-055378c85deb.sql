-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  total_budget NUMERIC NOT NULL DEFAULT 0,
  spent_budget NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Anyone can view projects"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add project_id to mission_orders
ALTER TABLE public.mission_orders 
ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Create mission_agents junction table for many-to-many relationship
CREATE TABLE public.mission_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES mission_orders(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mission_id, agent_id)
);

-- Enable RLS on mission_agents
ALTER TABLE public.mission_agents ENABLE ROW LEVEL SECURITY;

-- Mission agents policies
CREATE POLICY "Users can view mission agents for accessible missions"
  ON public.mission_agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mission_orders
      WHERE mission_orders.id = mission_agents.mission_id
      AND (
        mission_orders.agent_id = auth.uid()
        OR has_any_role(auth.uid(), ARRAY['chef_service'::app_role, 'directeur'::app_role, 'finance'::app_role, 'admin'::app_role])
      )
    )
  );

CREATE POLICY "Agents can add themselves to draft missions"
  ON public.mission_agents FOR INSERT
  WITH CHECK (
    auth.uid() = agent_id
    AND EXISTS (
      SELECT 1 FROM mission_orders
      WHERE mission_orders.id = mission_agents.mission_id
      AND mission_orders.status = 'draft'
    )
  );

-- Create role_rates table for predefined rates by role
CREATE TABLE public.role_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  per_diem_rate NUMERIC NOT NULL DEFAULT 0,
  transport_rate NUMERIC NOT NULL DEFAULT 0,
  accommodation_rate NUMERIC NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on role_rates
ALTER TABLE public.role_rates ENABLE ROW LEVEL SECURITY;

-- Role rates policies
CREATE POLICY "Anyone can view role rates"
  ON public.role_rates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage role rates"
  ON public.role_rates FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default rates
INSERT INTO public.role_rates (role, per_diem_rate, transport_rate, accommodation_rate) VALUES
  ('agent', 15000, 500, 10000),
  ('chef_service', 20000, 750, 15000),
  ('directeur', 30000, 1000, 25000),
  ('finance', 20000, 750, 15000),
  ('admin', 25000, 1000, 20000);

-- Add triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_role_rates_updated_at
  BEFORE UPDATE ON public.role_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for better performance
CREATE INDEX idx_mission_agents_mission_id ON public.mission_agents(mission_id);
CREATE INDEX idx_mission_agents_agent_id ON public.mission_agents(agent_id);
CREATE INDEX idx_mission_orders_project_id ON public.mission_orders(project_id);
CREATE INDEX idx_role_rates_role ON public.role_rates(role);