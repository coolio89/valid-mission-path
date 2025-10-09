-- Create mission_expenses table for detailed financial breakdown
CREATE TABLE public.mission_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.mission_orders(id) ON DELETE CASCADE,
  
  -- Accommodation details
  accommodation_days INTEGER DEFAULT 0,
  accommodation_unit_price NUMERIC DEFAULT 0,
  accommodation_total NUMERIC GENERATED ALWAYS AS (accommodation_days * accommodation_unit_price) STORED,
  
  -- Per diem
  per_diem_days INTEGER DEFAULT 0,
  per_diem_rate NUMERIC DEFAULT 0,
  per_diem_total NUMERIC GENERATED ALWAYS AS (per_diem_days * per_diem_rate) STORED,
  
  -- Transportation
  transport_type TEXT,
  transport_distance NUMERIC DEFAULT 0,
  transport_unit_price NUMERIC DEFAULT 0,
  transport_total NUMERIC GENERATED ALWAYS AS (transport_distance * transport_unit_price) STORED,
  
  -- Fuel
  fuel_quantity NUMERIC DEFAULT 0,
  fuel_unit_price NUMERIC DEFAULT 0,
  fuel_total NUMERIC GENERATED ALWAYS AS (fuel_quantity * fuel_unit_price) STORED,
  
  -- Other expenses
  other_expenses NUMERIC DEFAULT 0,
  other_expenses_description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mission_expenses ENABLE ROW LEVEL SECURITY;

-- Policies for mission_expenses
CREATE POLICY "Agents can create expenses for own missions"
ON public.mission_expenses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mission_orders
    WHERE mission_orders.id = mission_expenses.mission_id
    AND mission_orders.agent_id = auth.uid()
  )
);

CREATE POLICY "Agents can update expenses for own draft missions"
ON public.mission_expenses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mission_orders
    WHERE mission_orders.id = mission_expenses.mission_id
    AND mission_orders.agent_id = auth.uid()
    AND mission_orders.status = 'draft'
  )
);

CREATE POLICY "Users can view expenses for accessible missions"
ON public.mission_expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mission_orders
    WHERE mission_orders.id = mission_expenses.mission_id
    AND (
      mission_orders.agent_id = auth.uid()
      OR has_any_role(auth.uid(), ARRAY['chef_service'::app_role, 'directeur'::app_role, 'finance'::app_role, 'admin'::app_role])
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_mission_expenses_updated_at
BEFORE UPDATE ON public.mission_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();