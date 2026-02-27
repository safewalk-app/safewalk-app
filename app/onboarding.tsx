import { logger } from '@/lib/utils/logger';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Bienvenue sur SafeWalk',
    description:
      'Reste en sécurité lors de tes sorties en partageant ton heure de retour avec un proche.',
    icon: 'security',
    color: '#6C63FF',
  },
  {
    id: 2,
    title: 'Définis une heure de retour',
    description:
      'Indique à quelle heure tu penses rentrer. Un proche sera notifié si tu ne confirmes pas.',
    icon: 'schedule',
    color: '#3A86FF',
  },
  {
    id: 3,
    title: 'Partage ta position',
    description:
      "Optionnel : partage ta position en temps réel en cas d'alerte pour plus de sécurité.",
    icon: 'location-on',
    color: '#2DE2A6',
  },
  {
    id: 4,
    title: 'Tu es prêt !',
    description:
      "Configure ton contact d'urgence et commence à utiliser SafeWalk pour tes sorties.",
    icon: 'check-circle',
    color: '#22C55E',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/');
    } catch (error) {
      logger.error('Error saving onboarding state:', error);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <View className="flex-1 bg-background">
      <BubbleBackground />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="relative z-10"
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Skip Button */}
        <View className="flex-row justify-end mb-4">
          <Pressable onPress={handleSkip}>
            {({ pressed }) => (
              <Text
                className="text-sm font-semibold text-muted"
                style={{ opacity: pressed ? 0.6 : 1 }}
              >
                Passer
              </Text>
            )}
          </Pressable>
        </View>

        {/* Icon */}
        <ScreenTransition delay={0} duration={350}>
          <View className="flex-1 items-center justify-center gap-8">
            <View
              className="rounded-full p-6"
              style={{
                backgroundColor: `${slide.color}15`,
              }}
            >
              <MaterialIcons name={slide.icon as any} size={64} color={slide.color} />
            </View>

            {/* Title */}
            <View className="gap-3 items-center">
              <Text className="text-4xl font-bold text-foreground text-center">{slide.title}</Text>
              <Text className="text-base text-muted text-center leading-relaxed">
                {slide.description}
              </Text>
            </View>
          </View>
        </ScreenTransition>

        {/* Progress Dots */}
        <ScreenTransition delay={100} duration={350}>
          <View className="flex-row justify-center gap-2 mb-6">
            {SLIDES.map((_, index) => (
              <View
                key={index}
                className="rounded-full"
                style={{
                  width: index === currentSlide ? 24 : 8,
                  height: 8,
                  backgroundColor: index === currentSlide ? slide.color : '#E5E7EB',
                }}
              />
            ))}
          </View>
        </ScreenTransition>

        {/* Navigation Buttons */}
        <ScreenTransition delay={200} duration={350}>
          <View className="gap-3">
            {/* Next/Continue Button */}
            <CushionPillButton
              label={currentSlide === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}
              onPress={handleNext}
              variant="success"
              size="lg"
            />

            {/* Previous Button */}
            {currentSlide > 0 && (
              <Pressable onPress={handlePrevious}>
                {({ pressed }) => (
                  <View className="py-3 items-center" style={{ opacity: pressed ? 0.6 : 1 }}>
                    <Text className="text-base font-semibold text-muted">Précédent</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </ScreenTransition>
      </ScrollView>
    </View>
  );
}
