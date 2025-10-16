-- Add payment method and proof to mission_orders
ALTER TABLE public.mission_orders 
ADD COLUMN payment_method text,
ADD COLUMN payment_proof_url text;

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.mission_orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Allow agents to delete their own draft missions
DROP POLICY IF EXISTS "Agents can update own draft missions" ON public.mission_orders;

CREATE POLICY "Agents can update own draft missions"
ON public.mission_orders
FOR UPDATE
USING (
  (agent_id = auth.uid() AND status = 'draft'::mission_status)
  OR
  (
    ((status = 'pending_service'::mission_status) AND has_role(auth.uid(), 'chef_service'::app_role))
    OR ((status = 'pending_director'::mission_status) AND has_role(auth.uid(), 'directeur'::app_role))
    OR ((status = 'pending_finance'::mission_status) AND has_role(auth.uid(), 'finance'::app_role))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Agents can delete own draft missions"
ON public.mission_orders
FOR DELETE
USING (agent_id = auth.uid() AND status = 'draft'::mission_status);

-- Update generate_mission_reference function to include project code and date
CREATE OR REPLACE FUNCTION public.generate_mission_reference()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  ref_number INTEGER;
  year_part TEXT;
  month_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  month_part := TO_CHAR(NOW(), 'MM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM LENGTH(reference) - 3) AS INTEGER)), 0) + 1
  INTO ref_number
  FROM public.mission_orders
  WHERE reference LIKE 'BM' || year_part || month_part || '%';
  
  RETURN 'BM' || year_part || month_part || LPAD(ref_number::TEXT, 4, '0');
END;
$function$;

-- Create function to send notification on mission status change
CREATE OR REPLACE FUNCTION public.notify_mission_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  notification_title text;
  notification_message text;
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'pending_service' THEN
        notification_title := 'Mission soumise pour validation';
        notification_message := 'Votre mission "' || NEW.title || '" a été soumise pour validation.';
      WHEN 'pending_director' THEN
        notification_title := 'Mission validée par le chef de service';
        notification_message := 'Votre mission "' || NEW.title || '" a été validée par le chef de service.';
      WHEN 'pending_finance' THEN
        notification_title := 'Mission validée par le directeur';
        notification_message := 'Votre mission "' || NEW.title || '" a été validée par le directeur.';
      WHEN 'approved' THEN
        notification_title := 'Mission approuvée';
        notification_message := 'Votre mission "' || NEW.title || '" a été approuvée par le service financier.';
      WHEN 'rejected' THEN
        notification_title := 'Mission rejetée';
        notification_message := 'Votre mission "' || NEW.title || '" a été rejetée. Raison: ' || COALESCE(NEW.rejection_reason, 'Non spécifiée');
      ELSE
        RETURN NEW;
    END CASE;
    
    INSERT INTO public.notifications (user_id, mission_id, title, message, type)
    VALUES (NEW.agent_id, NEW.id, notification_title, notification_message, 
            CASE WHEN NEW.status = 'rejected' THEN 'error' 
                 WHEN NEW.status = 'approved' THEN 'success' 
                 ELSE 'info' END);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for mission status change notifications
CREATE TRIGGER mission_status_change_notification
AFTER UPDATE ON public.mission_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_mission_status_change();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;