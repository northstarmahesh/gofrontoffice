import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useInvitationAcceptance = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleInvitation = async () => {
      // Check URL hash for invitation token (after BankID redirect)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const invitationToken = params.get('invitation_token');

      if (!invitationToken) return;

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Du måste vara inloggad för att acceptera inbjudan');
          navigate('/auth');
          return;
        }

        // Accept invitation
        const { data, error } = await supabase.functions.invoke('accept-team-invitation', {
          body: { token: invitationToken, userId: user.id },
        });

        if (error) throw error;

        if (data.alreadyMember) {
          toast.info('Du är redan medlem i detta team');
        } else {
          toast.success('Välkommen till teamet! 🎉');
        }

        // Clean up URL and redirect
        window.history.replaceState({}, document.title, '/');
        navigate('/', { replace: true });
      } catch (error: any) {
        console.error('Error accepting invitation:', error);
        toast.error(error.message || 'Kunde inte acceptera inbjudan');
      }
    };

    handleInvitation();
  }, [navigate]);
};
