import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";

interface ProcessingScreenProps {
  onComplete: () => void;
}

const ProcessingScreen = ({ onComplete }: ProcessingScreenProps) => {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = [
    t("processingStep1"),
    t("processingStep2"),
    t("processingStep3"),
    t("processingStep4"),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        return prev + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const idx = Math.min(Math.floor(progress / 25), messages.length - 1);
    setMsgIndex(idx);
  }, [progress, messages.length]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
      >
        {/* Animated Funnel */}
        <div className="relative mb-8 h-32 w-32">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <clipPath id="funnelClip">
                <path d="M15 10 L85 10 L65 45 L65 80 L35 90 L35 45 Z" />
              </clipPath>
              <linearGradient id="fillGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            {/* Funnel outline */}
            <path
              d="M15 10 L85 10 L65 45 L65 80 L35 90 L35 45 Z"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="2"
            />
            {/* Fill */}
            <g clipPath="url(#funnelClip)">
              <motion.rect
                x="0"
                width="100"
                height="100"
                fill="url(#fillGrad)"
                initial={{ y: 100 }}
                animate={{ y: 100 - progress }}
                transition={{ ease: "easeOut" }}
              />
            </g>
          </svg>
        </div>

        <h2 className="mb-4 text-2xl font-bold text-foreground">{t("processingTitle")}</h2>

        {/* Progress bar */}
        <div className="mb-4 h-2 w-64 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full funnel-gradient"
            style={{ width: `${progress}%` }}
          />
        </div>

        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground"
        >
          {messages[msgIndex]}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default ProcessingScreen;
