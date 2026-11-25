import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { NX_TRANSITIONS } from '../../design/tokens';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={NX_TRANSITIONS.page}
      className={className}
    >
      {children}
    </motion.div>
  );
};
