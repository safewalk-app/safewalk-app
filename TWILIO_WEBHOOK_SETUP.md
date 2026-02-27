# Configuration du Webhook Twilio - SafeWalk

## 🎯 Objectif

Configurer Twilio pour envoyer les confirmations de SMS (statut de livraison) à l'API SafeWalk en temps réel.

## 📋 Informations Requises

### URL du Webhook

```
https://api.manus.im/api/webhooks/twilio
```

### Méthode HTTP

```
POST
```

### Paramètres Attendus

Twilio envoie les données suivantes au webhook :

```json
{
  "MessageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessageStatus": "delivered|failed|sent|undelivered",
  "To": "+33612345678",
  "From": "+33123456789",
  "ApiVersion": "2010-04-01"
}
```

### Statuts Possibles

- **sent** — SMS envoyé avec succès
- **delivered** — SMS livré au destinataire
- **failed** — Échec de l'envoi
- **undelivered** — SMS non livré après plusieurs tentatives

## 🔧 Étapes de Configuration

### 1. Accéder au Dashboard Twilio

1. Allez sur https://www.twilio.com/console
2. Connectez-vous avec vos identifiants
3. Cliquez sur **Phone Numbers** dans le menu de gauche

### 2. Configurer le Webhook pour les SMS

1. Sélectionnez **Manage Numbers** → **Active Numbers**
2. Cliquez sur le numéro de téléphone Twilio utilisé pour SafeWalk
3. Descendez jusqu'à la section **Messaging**

### 3. Ajouter l'URL du Webhook

1. Trouvez le champ **Webhook URL for Status Callbacks**
2. Collez l'URL : `https://api.manus.im/api/webhooks/twilio`
3. Assurez-vous que la méthode est **HTTP POST**
4. Cliquez sur **Save**

### 4. Activer les Notifications de Statut

1. Allez dans **Settings** → **General**
2. Trouvez **Webhook URL for Status Callbacks**
3. Vérifiez que c'est activé pour **SMS**
4. Cliquez sur **Save**

## ✅ Vérification

### Test du Webhook

Vous pouvez tester le webhook avec curl :

```bash
curl -X POST https://api.manus.im/api/webhooks/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d "AccountSid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d "MessageStatus=delivered" \
  -d "To=%2B33612345678" \
  -d "From=%2B33123456789" \
  -d "ApiVersion=2010-04-01"
```

### Vérifier les Logs

1. Allez dans **Logs** → **Webhooks** dans le dashboard Twilio
2. Vérifiez que les requêtes sont envoyées à votre URL
3. Vérifiez les codes de réponse (200 = succès)

## 🔐 Sécurité

### Valider les Requêtes Twilio

Le serveur SafeWalk valide automatiquement les requêtes Twilio en vérifiant :

1. **Signature Twilio** — Chaque requête inclut une signature `X-Twilio-Signature`
2. **Token d'authentification** — Utilise `TWILIO_AUTH_TOKEN` pour vérifier l'authenticité

### Code de Validation (Implémenté)

```typescript
// server/routes/webhooks.ts
import twilio from 'twilio';

export async function validateTwilioRequest(req: Request) {
  const signature = req.headers['x-twilio-signature'] as string;
  const url = `${process.env.API_URL}/api/webhooks/twilio`;

  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, req.body);
}
```

## 📊 Flux Complet

```
1. Utilisateur crée une sortie
   ↓
2. À l'expiration, triggerAlert() envoie SMS via Twilio
   ↓
3. Twilio envoie SMS au contact
   ↓
4. Twilio envoie webhook à SafeWalk avec statut
   ↓
5. SafeWalk met à jour le statut en temps réel
   ↓
6. L'écran alert-sent.tsx affiche "✅ Livré"
```

## 🚀 Après Configuration

Une fois le webhook configuré :

1. **Les statuts SMS s'afficheront en temps réel** dans l'écran d'alerte
2. **Les contacts verront le statut de livraison** dans l'historique
3. **Les confirmations seront reçues** via le webhook `/api/webhooks/sms-confirmation`

## 📞 Support

Si vous avez des problèmes :

1. Vérifiez que l'URL du webhook est correcte
2. Vérifiez que les secrets Twilio sont configurés
3. Consultez les logs Twilio pour les erreurs
4. Vérifiez que le serveur SafeWalk est accessible depuis Internet

## 🔗 Ressources Utiles

- [Documentation Twilio Webhooks](https://www.twilio.com/docs/sms/webhooks)
- [Twilio Console](https://www.twilio.com/console)
- [Validation des Requêtes Twilio](https://www.twilio.com/docs/sms/webhooks#validating-requests)
