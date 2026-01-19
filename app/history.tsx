import { ScrollView, View, Text, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { useApp } from '@/lib/context/app-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const { history } = useApp();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'returned':
        return { icon: '✅', label: 'Rentré' };
      case 'overdue':
        return { icon: '🚨', label: 'Alerte' };
      case 'cancelled':
        return { icon: '⛔', label: 'Annulé' };
      default:
        return { icon: '❓', label: 'Inconnu' };
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
    <ScreenContainer
      className="relative pb-32"
      containerClassName="bg-background"
    >
      <BubbleBackground />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="relative z-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="gap-1 mb-6">
          <Text className="text-3xl font-bold text-foreground">
            Historique
          </Text>
          <Text className="text-base text-muted">
            {history.length} sortie{history.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* History List */}
        {history.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3">
            <Text className="text-4xl">📋</Text>
            <Text className="text-base text-muted text-center">
              Aucune sortie enregistrée pour le moment.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {history.map((session) => {
              const status = getStatusIcon(session.status);
              return (
                <GlassCard
                  key={session.id}
                  className="gap-3"
                >
                  {/* Header */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">
                        {formatDate(session.startTime)}
                      </Text>
                    </View>
                    <Text className="text-2xl">{status.icon}</Text>
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
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
