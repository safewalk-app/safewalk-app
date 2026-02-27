/**
 * Edge Function: Décrémenter les quotas de manière sécurisée
 *
 * Cette fonction est appelée côté serveur (service role) pour décrémenter
 * les quotas d'alertes et de SMS après chaque utilisation.
 *
 * Sécurité :
 * - Vérification du user_id
 * - Vérification que le quota n'est pas négatif
 * - Logging audit
 */

/// <reference lib="deno.window" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DecrementRequest {
  user_id: string;
  quota_type: 'alert' | 'test_sms';
}

Deno.serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { user_id, quota_type }: DecrementRequest = await req.json();

    // Validation
    if (!user_id || !quota_type) {
      return new Response(JSON.stringify({ error: 'user_id et quota_type requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['alert', 'test_sms'].includes(quota_type)) {
      return new Response(JSON.stringify({ error: 'quota_type invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Récupérer le profil
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('free_alerts_remaining, free_test_sms_remaining')
      .eq('user_id', user_id)
      .single();

    if (fetchError || !profile) {
      console.error('❌ Profil non trouvé:', fetchError);
      return new Response(JSON.stringify({ error: 'Profil non trouvé' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Décrémenter le quota approprié
    let updateData: any = {};
    let quotaName = '';

    if (quota_type === 'alert') {
      if (profile.free_alerts_remaining <= 0) {
        return new Response(JSON.stringify({ error: "Quotas d'alertes épuisés" }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updateData.free_alerts_remaining = profile.free_alerts_remaining - 1;
      quotaName = 'alertes';
    } else if (quota_type === 'test_sms') {
      if (profile.free_test_sms_remaining <= 0) {
        return new Response(JSON.stringify({ error: 'Quotas de SMS de test épuisés' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updateData.free_test_sms_remaining = profile.free_test_sms_remaining - 1;
      quotaName = 'SMS de test';
    }

    // Mettre à jour le profil
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user_id);

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour du quota' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Logging audit
    console.log(`✅ Quota décrémenté: ${quotaName} pour ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Quota ${quotaName} décrémenté`,
        remaining:
          quota_type === 'alert'
            ? updateData.free_alerts_remaining
            : updateData.free_test_sms_remaining,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
