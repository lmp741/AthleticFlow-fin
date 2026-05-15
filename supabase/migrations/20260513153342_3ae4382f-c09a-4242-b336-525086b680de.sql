
-- Allow conversation creator to remove (kick) any member
CREATE POLICY "creator removes members"
ON public.conversation_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
  )
);

-- Replace permissive "any member updates conversation" with creator-only update
DROP POLICY IF EXISTS "member updates conversation" ON public.conversations;

CREATE POLICY "creator updates conversation"
ON public.conversations
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (
  -- Allow self to remain creator OR transfer to an existing member
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.conversation_members m
    WHERE m.conversation_id = conversations.id
      AND m.user_id = conversations.created_by
  )
);
