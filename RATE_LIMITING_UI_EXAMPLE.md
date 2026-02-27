# Exemple d'Utilisation du Rate Limiting dans l'UI

## 1. Importer les hooks et composants

```tsx
import { useCooldown } from '@/lib/hooks/use-cooldown';
import { RateLimitErrorAlert } from '@/components/rate-limit-error-alert';
import { tripService } from '@/lib/services/trip-service';
```

## 2. Utiliser le hook useCooldown dans un écran

### Exemple: Écran de création de sortie

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useCooldown } from '@/lib/hooks/use-cooldown';
import { RateLimitErrorAlert } from '@/components/rate-limit-error-alert';
import { tripService } from '@/lib/services/trip-service';
import { cn } from '@/lib/utils';

export default function NewSessionScreen() {
  const [destination, setDestination] = useState('');
  const [deadline, setDeadline] = useState<Date>(new Date(Date.now() + 30 * 60000));
  const [rateLimitError, setRateLimitError] = useState<{
    visible: boolean;
    message?: string;
    retryAfter?: number;
  }>({ visible: false });

  // Cooldown de 2 secondes entre les clics
  const { trigger, isOnCooldown, remainingTime } = useCooldown({ duration: 2000 });

  const handleStartSession = async () => {
    await trigger(async () => {
      const result = await tripService.startTrip({
        deadlineISO: deadline.toISOString(),
        shareLocation: true,
        destinationNote: destination,
      });

      if (!result.success) {
        if (result.errorCode === 'rate_limit_exceeded') {
          // Afficher l'alerte de rate limit
          setRateLimitError({
            visible: true,
            message: result.error,
            retryAfter: parseInt(result.message?.match(/\d+/)?.[0] || '60') * 1000,
          });

          // Masquer l'alerte après 5 secondes
          setTimeout(() => {
            setRateLimitError({ visible: false });
          }, 5000);
        } else {
          // Autres erreurs
          console.error('Error:', result.error);
        }
      } else {
        // Succès - naviguer vers l'écran de session active
        // navigation.navigate("active-session", { tripId: result.tripId });
      }
    });
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Afficher l'alerte de rate limit */}
        <RateLimitErrorAlert
          visible={rateLimitError.visible}
          message={rateLimitError.message}
          retryAfter={rateLimitError.retryAfter}
          onDismiss={() => setRateLimitError({ visible: false })}
        />

        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Nouvelle sortie</Text>

          {/* Destination input */}
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">Destination</Text>
            <View className="border border-border rounded-lg p-3 bg-surface">
              <Text className="text-foreground">{destination || 'Non spécifiée'}</Text>
            </View>
          </View>

          {/* Deadline display */}
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">Retour prévu</Text>
            <View className="border border-border rounded-lg p-3 bg-surface">
              <Text className="text-foreground">{deadline.toLocaleTimeString()}</Text>
            </View>
          </View>

          {/* Start button with cooldown */}
          <TouchableOpacity
            onPress={handleStartSession}
            disabled={isOnCooldown}
            className={cn(
              'bg-primary py-3 px-6 rounded-lg items-center',
              isOnCooldown && 'opacity-50',
            )}
          >
            <Text className="text-white font-bold text-base">
              {isOnCooldown
                ? `Attendre ${Math.ceil(remainingTime / 1000)}s`
                : 'Commencer la sortie'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
```

## 3. Utiliser le hook useCooldown dans l'écran OTP

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useCooldown } from '@/lib/hooks/use-cooldown';
import { RateLimitErrorAlert } from '@/components/rate-limit-error-alert';
import { otpService } from '@/lib/services/otp-service';
import { cn } from '@/lib/utils';

export default function PhoneVerificationScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [rateLimitError, setRateLimitError] = useState<{
    visible: boolean;
    message?: string;
  }>({ visible: false });

  // Cooldown de 60 secondes entre les envois d'OTP
  const {
    trigger: triggerSendOtp,
    isOnCooldown: isOtpOnCooldown,
    remainingTime: otpRemainingTime,
  } = useCooldown({
    duration: 60000,
  });

  const handleSendOtp = async () => {
    await triggerSendOtp(async () => {
      const result = await otpService.sendOtp(phoneNumber);

      if (!result.success) {
        if (result.errorCode === 'rate_limit_exceeded') {
          setRateLimitError({
            visible: true,
            message: result.message,
          });

          setTimeout(() => {
            setRateLimitError({ visible: false });
          }, 5000);
        } else {
          console.error('Error:', result.error);
        }
      } else {
        // OTP envoyé avec succès
        setStep('otp');
      }
    });
  };

  const handleVerifyOtp = async () => {
    const result = await otpService.verifyOtp(phoneNumber, otpCode);

    if (!result.success) {
      if (result.errorCode === 'rate_limit_exceeded') {
        setRateLimitError({
          visible: true,
          message: result.message,
        });

        setTimeout(() => {
          setRateLimitError({ visible: false });
        }, 5000);
      } else {
        console.error('Error:', result.error);
      }
    } else {
      // OTP vérifié avec succès
      // navigation.navigate("home");
    }
  };

  return (
    <ScreenContainer className="p-4">
      {/* Afficher l'alerte de rate limit */}
      <RateLimitErrorAlert
        visible={rateLimitError.visible}
        message={rateLimitError.message}
        onDismiss={() => setRateLimitError({ visible: false })}
      />

      {step === 'phone' ? (
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Vérification du numéro</Text>

          <TextInput
            placeholder="+33..."
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            className="border border-border rounded-lg p-3 text-foreground"
            editable={!isOtpOnCooldown}
          />

          <TouchableOpacity
            onPress={handleSendOtp}
            disabled={isOtpOnCooldown}
            className={cn(
              'bg-primary py-3 px-6 rounded-lg items-center',
              isOtpOnCooldown && 'opacity-50',
            )}
          >
            <Text className="text-white font-bold">
              {isOtpOnCooldown ? `Attendre ${Math.ceil(otpRemainingTime / 1000)}s` : 'Envoyer OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Entrez le code OTP</Text>

          <TextInput
            placeholder="000000"
            value={otpCode}
            onChangeText={setOtpCode}
            maxLength={6}
            keyboardType="numeric"
            className="border border-border rounded-lg p-3 text-foreground"
          />

          <TouchableOpacity
            onPress={handleVerifyOtp}
            className="bg-primary py-3 px-6 rounded-lg items-center"
          >
            <Text className="text-white font-bold">Vérifier</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}
```

## 4. Patterns Clés

### Pattern 1: Cooldown sur les boutons

```tsx
<TouchableOpacity
  disabled={isOnCooldown}
  className={cn('bg-primary py-3 rounded-lg', isOnCooldown && 'opacity-50')}
>
  <Text>{isOnCooldown ? `Attendre ${Math.ceil(remainingTime / 1000)}s` : 'Cliquer'}</Text>
</TouchableOpacity>
```

### Pattern 2: Afficher les erreurs de rate limit

```tsx
if (result.errorCode === 'rate_limit_exceeded') {
  setRateLimitError({
    visible: true,
    message: result.error,
  });

  setTimeout(() => {
    setRateLimitError({ visible: false });
  }, 5000);
}
```

### Pattern 3: Utiliser le hook useCooldown

```tsx
const { trigger, isOnCooldown, remainingTime } = useCooldown({ duration: 2000 });

const handleClick = async () => {
  await trigger(async () => {
    // Faire quelque chose
  });
};
```

## 5. Checklist d'Implémentation

- [ ] Importer `useCooldown` hook
- [ ] Importer `RateLimitErrorAlert` composant
- [ ] Ajouter l'état pour les erreurs de rate limit
- [ ] Utiliser `useCooldown` hook sur les boutons critiques
- [ ] Afficher `RateLimitErrorAlert` quand `errorCode === "rate_limit_exceeded"`
- [ ] Tester avec des clics rapides
- [ ] Vérifier que le cooldown fonctionne correctement
- [ ] Vérifier que le message d'erreur s'affiche correctement

## 6. Endpoints à Protéger avec Cooldown

| Endpoint   | Cooldown | Raison                          |
| ---------- | -------- | ------------------------------- |
| send-otp   | 60s      | Limiter les SMS                 |
| verify-otp | 5s       | Permettre les erreurs de saisie |
| start-trip | 2s       | Éviter les clics accidentels    |
| test-sms   | 60s      | Limiter les SMS de test         |
| sos        | 2s       | Permettre les urgences réelles  |
| checkin    | 2s       | Éviter les clics accidentels    |
| extend     | 2s       | Éviter les clics accidentels    |

## 7. Tester le Rate Limiting

```bash
# 1. Ouvrir l'app
# 2. Aller à Phone Verification
# 3. Cliquer "Envoyer OTP" 6 fois rapidement
# 4. À la 6ème tentative, vous devez voir:
#    - Message d'erreur "Trop de requêtes"
#    - Bouton désactivé pendant 60 secondes
#    - Timer "Attendre 60s"

# 5. Vérifier les logs dans Supabase
# SELECT * FROM rate_limit_logs WHERE endpoint = 'send-otp' ORDER BY timestamp DESC LIMIT 10;
```
