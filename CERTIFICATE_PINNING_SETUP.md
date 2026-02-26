# Certificate Pinning Setup Guide

**Version:** 1.0  
**Date:** 26 février 2026

---

## 📋 Vue d'Ensemble

Ce guide explique comment obtenir les clés publiques des certificats SSL/TLS et les configurer pour le Certificate Pinning dans SafeWalk.

---

## 🔑 Obtenir les Clés Publiques des Certificats

### Pour api.manus.im

#### Méthode 1: Utiliser OpenSSL (Recommandé)

```bash
# Obtenir le certificat et générer le SHA-256 public key pin
openssl s_client -connect api.manus.im:443 -showcerts < /dev/null | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  base64
```

**Résultat attendu:**
```
sha256/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=
```

#### Méthode 2: Utiliser un Service en Ligne

1. Visitez https://www.ssllabs.com/ssltest/
2. Entrez `api.manus.im`
3. Attendez les résultats
4. Cherchez "Public Key Pins (HPKP)"
5. Copiez les valeurs SHA-256

### Pour kycuteffcbqizyqlhczc.supabase.co

```bash
openssl s_client -connect kycuteffcbqizyqlhczc.supabase.co:443 -showcerts < /dev/null | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  base64
```

---

## 🔐 Configurer les Certificats dans SafeWalk

### Étape 1: Mettre à jour certificate-pinning.service.ts

```typescript
// lib/services/certificate-pinning.service.ts

const PINNED_CERTIFICATES: Record<string, string[]> = {
  'api.manus.im': [
    // Certificat principal
    'sha256/YOUR_MAIN_CERTIFICATE_KEY_HERE=',
    // Certificat de backup (optionnel)
    'sha256/YOUR_BACKUP_CERTIFICATE_KEY_HERE=',
  ],
  'kycuteffcbqizyqlhczc.supabase.co': [
    // Certificat principal
    'sha256/YOUR_SUPABASE_MAIN_KEY_HERE=',
    // Certificat de backup (optionnel)
    'sha256/YOUR_SUPABASE_BACKUP_KEY_HERE=',
  ],
};
```

### Étape 2: Obtenir les Clés de Backup

Les clés de backup sont importantes pour éviter les blocages en cas de rotation de certificat.

```bash
# Obtenir les certificats intermédiaires
openssl s_client -connect api.manus.im:443 -showcerts < /dev/null | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  base64

# Répéter pour les certificats intermédiaires
```

### Étape 3: Tester la Configuration

```typescript
import { certificatePinningService } from '@/lib/services/certificate-pinning.service';

// Initialiser le service
certificatePinningService.initialize();

// Tester la validation
const host = 'api.manus.im';
const certificateKey = 'sha256/YOUR_CERTIFICATE_KEY_HERE=';

const isValid = certificatePinningService.validateCertificate(host, certificateKey);
console.log('Certificate valid:', isValid);
```

---

## 🔄 Rotation des Certificats

### Quand les Certificats Changent

1. **Avant la rotation:**
   - Ajouter le nouveau certificat comme backup
   - Déployer la mise à jour
   - Attendre 24-48 heures

2. **Pendant la rotation:**
   - Le serveur utilise le nouveau certificat
   - SafeWalk accepte les deux (ancien + nouveau)

3. **Après la rotation:**
   - Supprimer l'ancien certificat
   - Déployer la mise à jour

### Code pour Ajouter/Supprimer des Certificats

```typescript
// Ajouter un nouveau certificat
certificatePinningService.addPinnedCertificate(
  'api.manus.im',
  'sha256/NEW_CERTIFICATE_KEY='
);

// Supprimer un ancien certificat
certificatePinningService.removePinnedCertificate(
  'api.manus.im',
  'sha256/OLD_CERTIFICATE_KEY='
);
```

---

## 🚨 Gestion des Violations

### Monitoring des Violations

```typescript
// Obtenir le nombre de violations
const violationCount = certificatePinningService.getViolationCount();

if (violationCount > 5) {
  logger.error('🚨 Trop de violations - possible attaque MITM!');
  // Alerter l'administrateur
  // Forcer la réauthentification
}
```

### Actions en Cas de Violation

1. **Log l'incident:** Enregistrer tous les détails
2. **Alerter l'utilisateur:** Afficher un message d'erreur
3. **Forcer la réauthentification:** Demander à l'utilisateur de se reconnecter
4. **Notifier l'équipe:** Envoyer une alerte à l'équipe de sécurité

---

## 📊 Certificats Actuels (Exemples)

### api.manus.im

| Type | Valeur |
|------|--------|
| **Host** | api.manus.im |
| **Port** | 443 |
| **Certificat** | Let's Encrypt (ou autre) |
| **Expiration** | À déterminer |
| **Public Key Pin** | À obtenir |

### kycuteffcbqizyqlhczc.supabase.co

| Type | Valeur |
|------|--------|
| **Host** | kycuteffcbqizyqlhczc.supabase.co |
| **Port** | 443 |
| **Certificat** | Supabase SSL |
| **Expiration** | À déterminer |
| **Public Key Pin** | À obtenir |

---

## ✅ Checklist de Configuration

- [ ] Obtenir la clé publique pour api.manus.im
- [ ] Obtenir la clé publique de backup pour api.manus.im
- [ ] Obtenir la clé publique pour supabase.co
- [ ] Obtenir la clé publique de backup pour supabase.co
- [ ] Ajouter les clés dans certificate-pinning.service.ts
- [ ] Tester la validation des certificats
- [ ] Tester avec un certificat invalide (doit échouer)
- [ ] Configurer le monitoring des violations
- [ ] Déployer en production
- [ ] Monitorer les logs pendant 24-48 heures

---

## 🔧 Dépannage

### Erreur: "Certificate validation failed"

**Cause:** Le certificat du serveur n'est pas dans la liste des certificats épinglés.

**Solution:**
1. Vérifier que la clé publique est correcte
2. Vérifier que le host est correct
3. Vérifier que le certificat n'a pas changé
4. Ajouter le nouveau certificat comme backup

### Erreur: "No pinned certificate for host"

**Cause:** Aucun certificat n'est configuré pour ce host.

**Solution:**
1. Ajouter le certificat pour ce host
2. Vérifier que le host est correct
3. Redéployer l'app

### Erreur: "Too many violations"

**Cause:** Trop de tentatives de connexion avec des certificats invalides.

**Solution:**
1. Vérifier la connexion Internet
2. Vérifier que le certificat du serveur n'a pas changé
3. Vérifier qu'il n'y a pas d'attaque MITM
4. Réinitialiser le compteur de violations

---

## 📚 Ressources

- [OWASP Certificate Pinning](https://owasp.org/www-community/attacks/Certificate_and_Public_Key_Pinning)
- [RFC 7469 - Public Key Pinning Extension](https://tools.ietf.org/html/rfc7469)
- [SSL Labs](https://www.ssllabs.com/)
- [Let's Encrypt](https://letsencrypt.org/)

---

## 🔐 Bonnes Pratiques

1. **Toujours avoir un backup:** Configurez au moins 2 certificats
2. **Monitorer les violations:** Alertez l'équipe en cas de problème
3. **Tester régulièrement:** Vérifiez que la validation fonctionne
4. **Documenter les changements:** Enregistrez quand les certificats changent
5. **Planifier les rotations:** Préparez les changements à l'avance

---

**Document généré le:** 26 février 2026  
**Prochaine révision:** 26 mai 2026
