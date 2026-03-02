import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface BreathingExerciseProps {
  inhale: number;
  hold: number;
  exhale: number;
  cycles: number;
  onComplete: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale';

const PHASE_LABELS: Record<Phase, string> = {
  inhale: 'Breathe in...',
  hold: 'Hold...',
  exhale: 'Breathe out...',
};

const PHASE_COLORS: Record<Phase, string> = {
  inhale: 'oklch(0.72 0.15 200)',
  hold: 'oklch(0.75 0.12 280)',
  exhale: 'oklch(0.70 0.14 160)',
};

export function BreathingExercise({
  inhale,
  hold,
  exhale,
  cycles,
  onComplete,
}: BreathingExerciseProps) {
  const [currentCycle, setCurrentCycle] = useState(1);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [countdown, setCountdown] = useState(inhale);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('inhale');
  const cycleRef = useRef(1);
  const countdownRef = useRef(inhale);

  const getDuration = useCallback(
    (p: Phase): number => {
      if (p === 'inhale') return inhale;
      if (p === 'hold') return hold;
      return exhale;
    },
    [inhale, hold, exhale],
  );

  const nextPhaseOrder: Record<Phase, Phase> = {
    inhale: 'hold',
    hold: 'exhale',
    exhale: 'inhale',
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      countdownRef.current -= 1;

      if (countdownRef.current <= 0) {
        const currentPhase = phaseRef.current;
        const next = nextPhaseOrder[currentPhase];

        if (currentPhase === 'exhale') {
          // End of cycle
          if (cycleRef.current >= cycles) {
            // All cycles done
            if (timerRef.current) clearInterval(timerRef.current);
            onComplete();
            return;
          }
          cycleRef.current += 1;
          setCurrentCycle(cycleRef.current);
        }

        phaseRef.current = next;
        countdownRef.current = getDuration(next);
        setPhase(next);
        setCountdown(countdownRef.current);
      } else {
        setCountdown(countdownRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cycles, getDuration, onComplete]);

  // Circle scale: small at exhale end, large at inhale end
  const getScale = (): number => {
    if (phase === 'inhale') {
      return 0.5 + 0.5 * ((inhale - countdown) / inhale);
    }
    if (phase === 'hold') {
      return 1;
    }
    // exhale
    return 1 - 0.5 * ((exhale - countdown) / exhale);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div className="relative flex items-center justify-center w-24 h-24">
        <motion.div
          className="rounded-full absolute"
          animate={{
            scale: getScale(),
            backgroundColor: PHASE_COLORS[phase],
          }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          style={{
            width: 96,
            height: 96,
            opacity: 0.8,
          }}
        />
        <span className="relative z-10 text-2xl font-bold text-white">{countdown}</span>
      </div>

      <p className="text-sm font-medium">{PHASE_LABELS[phase]}</p>

      <p className="text-xs text-muted-foreground">
        Cycle {currentCycle}/{cycles}
      </p>
    </div>
  );
}
