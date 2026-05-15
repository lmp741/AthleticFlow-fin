CREATE POLICY "organizer removes participants"
ON public.game_participants
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_participants.game_id AND g.organizer_id = auth.uid()));