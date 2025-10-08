-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('agent', 'chef_service', 'directeur', 'finance', 'admin');

-- Create enum for mission status
CREATE TYPE public.mission_status AS ENUM (
  'draft',
  'pending_service',
  'pending_director',
  'pending_finance',
  'approved',
  'rejected',
  'paid'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create mission_orders table
CREATE TABLE public.mission_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  estimated_amount NUMERIC(10,2) NOT NULL,
  actual_amount NUMERIC(10,2),
  status public.mission_status DEFAULT 'draft' NOT NULL,
  rejection_reason TEXT,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mission_orders ENABLE ROW LEVEL SECURITY;

-- Create mission_signatures table
CREATE TABLE public.mission_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.mission_orders(id) ON DELETE CASCADE NOT NULL,
  signer_id UUID REFERENCES public.profiles(id) NOT NULL,
  signer_role public.app_role NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  comment TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mission_signatures ENABLE ROW LEVEL SECURITY;

-- Create mission_comments table
CREATE TABLE public.mission_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.mission_orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mission_comments ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default agent role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_mission_orders_updated_at
  BEFORE UPDATE ON public.mission_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mission_orders
CREATE POLICY "Users can view missions they're involved in"
  ON public.mission_orders FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    public.has_any_role(auth.uid(), ARRAY['chef_service', 'directeur', 'finance', 'admin']::public.app_role[])
  );

CREATE POLICY "Agents can create missions"
  ON public.mission_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own draft missions"
  ON public.mission_orders FOR UPDATE
  TO authenticated
  USING (
    agent_id = auth.uid() AND status = 'draft'
  );

CREATE POLICY "Approvers can update pending missions"
  ON public.mission_orders FOR UPDATE
  TO authenticated
  USING (
    (status = 'pending_service' AND public.has_role(auth.uid(), 'chef_service')) OR
    (status = 'pending_director' AND public.has_role(auth.uid(), 'directeur')) OR
    (status = 'pending_finance' AND public.has_role(auth.uid(), 'finance')) OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for mission_signatures
CREATE POLICY "Users can view signatures of accessible missions"
  ON public.mission_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mission_orders
      WHERE id = mission_id AND (
        agent_id = auth.uid() OR
        public.has_any_role(auth.uid(), ARRAY['chef_service', 'directeur', 'finance', 'admin']::public.app_role[])
      )
    )
  );

CREATE POLICY "Users can create signatures for their role"
  ON public.mission_signatures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = signer_id);

-- RLS Policies for mission_comments
CREATE POLICY "Users can view comments of accessible missions"
  ON public.mission_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mission_orders
      WHERE id = mission_id AND (
        agent_id = auth.uid() OR
        public.has_any_role(auth.uid(), ARRAY['chef_service', 'directeur', 'finance', 'admin']::public.app_role[])
      )
    )
  );

CREATE POLICY "Users can create comments"
  ON public.mission_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to generate mission reference
CREATE OR REPLACE FUNCTION public.generate_mission_reference()
RETURNS TEXT
LANGUAGE PLPGSQL
AS $$
DECLARE
  ref_number INTEGER;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 5) AS INTEGER)), 0) + 1
  INTO ref_number
  FROM public.mission_orders
  WHERE reference LIKE 'BM' || year_part || '%';
  
  RETURN 'BM' || year_part || LPAD(ref_number::TEXT, 4, '0');
END;
$$;