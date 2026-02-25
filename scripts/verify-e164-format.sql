-- Script: Vérifier et corriger le format E.164 des numéros de téléphone
-- Format E.164: +[1-9]\d{1,14}
-- Exemples valides: +33612345678, +14155552671, +442071838750

-- ============================================================================
-- 1. VÉRIFIER LES NUMÉROS INVALIDES
-- ============================================================================

-- Afficher tous les numéros invalides (ne commencent pas par +)
SELECT 
  id,
  user_id,
  phone_number,
  priority,
  created_at,
  CASE 
    WHEN phone_number NOT LIKE '+%' THEN 'Pas de +'
    WHEN phone_number ~ '^\+[0-9]{1,14}$' THEN 'Valide'
    ELSE 'Format invalide'
  END as status
FROM emergency_contacts
WHERE phone_number NOT LIKE '+%' OR phone_number !~ '^\+[1-9]\d{1,14}$'
ORDER BY created_at DESC;

-- ============================================================================
-- 2. COMPTER LES NUMÉROS INVALIDES
-- ============================================================================

SELECT 
  COUNT(*) as total_invalides,
  SUM(CASE WHEN phone_number NOT LIKE '+%' THEN 1 ELSE 0 END) as sans_plus,
  SUM(CASE WHEN phone_number LIKE '+0%' THEN 1 ELSE 0 END) as commence_par_zero
FROM emergency_contacts
WHERE phone_number NOT LIKE '+%' OR phone_number !~ '^\+[1-9]\d{1,14}$';

-- ============================================================================
-- 3. CORRIGER LES NUMÉROS FRANÇAIS (Format courant: 06... ou 07...)
-- ============================================================================

-- Avant de corriger, vérifier quels numéros seront affectés
SELECT 
  id,
  phone_number,
  '+33' || SUBSTRING(phone_number, 2) as phone_number_corrige
FROM emergency_contacts
WHERE phone_number ~ '^0[67][0-9]{8}$'  -- Numéros français sans +
ORDER BY created_at DESC;

-- Corriger les numéros français
UPDATE emergency_contacts
SET phone_number = '+33' || SUBSTRING(phone_number, 2)
WHERE phone_number ~ '^0[67][0-9]{8}$';

-- ============================================================================
-- 4. CORRIGER LES NUMÉROS FRANÇAIS AVEC + MAIS MAUVAIS PRÉFIXE
-- ============================================================================

-- Avant de corriger
SELECT 
  id,
  phone_number,
  CASE 
    WHEN phone_number LIKE '+330%' THEN '+33' || SUBSTRING(phone_number, 5)
    ELSE phone_number
  END as phone_number_corrige
FROM emergency_contacts
WHERE phone_number LIKE '+330%'
ORDER BY created_at DESC;

-- Corriger les numéros +330... → +33...
UPDATE emergency_contacts
SET phone_number = '+33' || SUBSTRING(phone_number, 5)
WHERE phone_number LIKE '+330%';

-- ============================================================================
-- 5. CORRIGER LES NUMÉROS AVEC ESPACES OU TIRETS
-- ============================================================================

-- Avant de corriger
SELECT 
  id,
  phone_number,
  REGEXP_REPLACE(phone_number, '[- ]', '', 'g') as phone_number_corrige
FROM emergency_contacts
WHERE phone_number LIKE '% %' OR phone_number LIKE '%-%'
ORDER BY created_at DESC;

-- Corriger les numéros avec espaces/tirets
UPDATE emergency_contacts
SET phone_number = REGEXP_REPLACE(phone_number, '[- ]', '', 'g')
WHERE phone_number LIKE '% %' OR phone_number LIKE '%-%';

-- ============================================================================
-- 6. VÉRIFIER QUE TOUS LES NUMÉROS SONT MAINTENANT VALIDES
-- ============================================================================

-- Afficher les numéros qui ne sont toujours pas valides
SELECT 
  id,
  user_id,
  phone_number,
  priority,
  CASE 
    WHEN phone_number ~ '^\+[1-9]\d{1,14}$' THEN '✅ Valide'
    ELSE '❌ Invalide'
  END as status
FROM emergency_contacts
WHERE phone_number !~ '^\+[1-9]\d{1,14}$'
ORDER BY created_at DESC;

-- ============================================================================
-- 7. STATISTIQUES FINALES
-- ============================================================================

SELECT 
  COUNT(*) as total_contacts,
  SUM(CASE WHEN phone_number ~ '^\+[1-9]\d{1,14}$' THEN 1 ELSE 0 END) as valides,
  SUM(CASE WHEN phone_number !~ '^\+[1-9]\d{1,14}$' THEN 1 ELSE 0 END) as invalides,
  ROUND(100.0 * SUM(CASE WHEN phone_number ~ '^\+[1-9]\d{1,14}$' THEN 1 ELSE 0 END) / COUNT(*), 2) as pourcentage_valides
FROM emergency_contacts;

-- ============================================================================
-- 8. AJOUTER UNE CONTRAINTE POUR FORCER LE FORMAT E.164
-- ============================================================================

-- Ajouter une contrainte de validation (optionnel)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE emergency_contacts
    ADD CONSTRAINT phone_number_e164_format 
    CHECK (phone_number ~ '^\+[1-9]\d{1,14}$');
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ============================================================================
-- 9. AUDIT: AFFICHER LES CORRECTIONS EFFECTUÉES
-- ============================================================================

-- Créer une table d'audit (optionnel)
CREATE TABLE IF NOT EXISTS phone_number_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES emergency_contacts(id),
  old_phone_number VARCHAR NOT NULL,
  new_phone_number VARCHAR NOT NULL,
  corrected_at TIMESTAMPTZ DEFAULT NOW(),
  correction_type VARCHAR
);

-- ============================================================================
-- NOTES D'UTILISATION
-- ============================================================================

/*
Format E.164 valides:
✅ +33612345678 (France)
✅ +14155552671 (États-Unis)
✅ +442071838750 (Royaume-Uni)
✅ +33123456789 (France, Paris)

Formats invalides:
❌ 0612345678 (France, sans +)
❌ +330612345678 (France, mauvais préfixe)
❌ +33 6 12 34 56 78 (France, avec espaces)
❌ +33-6-12-34-56-78 (France, avec tirets)
❌ 06-12-34-56-78 (France, sans +, avec tirets)

Exécution du script:
1. Exécuter la section 1 pour voir les numéros invalides
2. Exécuter la section 2 pour compter les invalides
3. Exécuter les sections 3-5 pour corriger les numéros
4. Exécuter la section 6 pour vérifier les corrections
5. Exécuter la section 7 pour voir les statistiques finales
6. (Optionnel) Exécuter la section 8 pour ajouter une contrainte
*/
