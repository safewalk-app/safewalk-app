import { ScrollView, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { useApp } from '@/lib/context/app-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history } = useApp();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'returned':
        return { icon: 'check-circle' as const, color: '#22C55E', label: 'Rentré' };
      case 'overdue':
        return { icon: 'warning' as const, color: '#FF4D4D', label: 'Alerte' };
      case 'cancelled':
        return { icon: 'cancel' as const, color: '#B0B0B0', label: 'Annulé' };
      default:
        return { icon: 'help' as const, color: '#6C63FF', label: 'Inconnu' };
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: number, end?: number) => {
    if (!end) return '--';
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <View className="flex-1 bg-background">
      <BubbleBackground />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="relative z-10"
        showsVerticalScrollIndicator={false}
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Header */}
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-4">
            <Text className="text-4xl font-bold text-foreground">Historique</Text>
            <Text className="text-base text-muted">
              {history.length} sortie{history.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </ScreenTransition>

        {/* History List */}
        {history.length === 0 ? (
          <ScreenTransition delay={100} duration={350}>
            <View className="flex-1 items-center justify-center gap-3">
              <MaterialIcons name="history" size={48} color="#B0B0B0" />
              <Text className="text-base text-muted text-center">
                Aucune sortie enregistrée pour le moment.
              </Text>
            </View>
          </ScreenTransition>
        ) : (
          <View className="gap-3">
            {history.map((session, index) => {
              const status = getStatusIcon(session.status);
              return (
                <ScreenTransition key={session.id} delay={100 + index * 50} duration={350}>
                  <GlassCard className="gap-3">
                    {/* Header */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {formatDate(session.startTime)}
                        </Text>
                      </View>
                      <MaterialIcons name={status.icon as any} size={24} color={status.color} />
                    </View>

                    {/* Details */}
                    <View className="gap-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">Statut :</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {status.label}
                        </Text>
                      </View>

                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">Heure limite :</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {new Date(session.limitTime).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">Durée :</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {calculateDuration(session.startTime, session.endTime)}
                        </Text>
                      </View>

                      {session.note && (
                        <View className="flex-row justify-between">
                          <Text className="text-sm text-muted">Localisation :</Text>
                          <Text className="text-sm font-semibold text-foreground">
                            {session.note}
                          </Text>
                        </View>
                      )}
                    </View>
                  </GlassCard>
                </ScreenTransition>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
